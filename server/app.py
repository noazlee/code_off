from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
import psycopg2, binascii, os, hashlib, uuid, random, string, tempfile, subprocess, docker, shutil
import tarfile, io

app = Flask(__name__)
app.config['SECRET_KEY'] = 'MaSz55vnLfTAN5cG'
CORS(app, supports_credentials=True, origins="*")
socketio = SocketIO(app, cors_allowed_origins="*")

conn = psycopg2.connect(
    host = 'db',
    port = 5432,
    database = 'postgres',
    user = 'postgres',
    password = 'password'
)
cur = conn.cursor()

client = docker.from_env()

def gen_salt(size: int) -> bytes:
    return binascii.hexlify(os.urandom(size))

def hash(password: str, b_salt: bytes) -> bytes:
    sha256 = hashlib.sha256()
    b_password = password.encode()
    sha256.update(b_password)
    sha256.update(b_salt)
    return sha256.hexdigest().encode()

@app.route("/", methods=["GET"])
def main():
    return jsonify({"message":"yo"})

@app.route("/api/signup", methods=["POST"])
def signup() -> None:
    if request.method == "POST":
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400
        
        # Check if username already exists
        cur.execute("SELECT EXISTS(SELECT 1 FROM users WHERE username = %s)", (username,))
        exists = cur.fetchone()[0]
        if exists:
            return jsonify({"error": "Username already exists"}), 400

        salt = gen_salt(16)
        hashed_password = hash(password, salt)

        try:
            cur.execute(
                "INSERT INTO users (username, password, salt) VALUES (%s, %s, %s)",
                (username, hashed_password, salt)
            )
            conn.commit()

            # Get user ID
            cur.execute("SELECT user_id FROM users WHERE username = %s", (username,))
            user_id = cur.fetchone()[0]

            return jsonify({"message": "User registered successfully",
                            "user_id": user_id}), 201
        
        except psycopg2.Error as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        
@app.route("/api/login", methods=["POST"])
def login() -> None:
    if request.method == "POST":
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400

        try:
            cur.execute(
                "SELECT password, salt FROM users WHERE username = %s",
                (username,)
            )
            user = cur.fetchone()

            if user is None:
                return jsonify({"error": "Invalid username or password"}), 401
            
            stored_password, salt = tuple([item.tobytes() for item in user])
            hashed_password = hash(password, salt)

            if hashed_password == stored_password:
                cur.execute("SELECT user_id FROM users WHERE username = %s", (username,))
                user_id = cur.fetchone()[0]

                return jsonify({"message": "User logged in successfully",
                                "user_id": user_id}), 200
            else:
                return jsonify({"error": "Invalid username or password"}), 401
        
        except psycopg2.Error as e:
            return jsonify({"error": str(e)}), 500

@app.route("/api/get-question", methods=["POST"])
def get_question():
    """
    Get a random question of specified difficulty that hasn't been asked yet
    
    Parameters: room_code, difficulty, user_id from request JSON
    Dependencies: game_rooms dict, database connection
    Returns: JSON response with question data
    """
    data = request.get_json()
    room_code = data.get("room_code")
    difficulty = data.get("difficulty")
    user_id = data.get("user_id")
    
    if not room_code or not difficulty or not user_id:
        return jsonify({"error": "Room code, difficulty, and user_id are required"}), 400
    
    if room_code not in game_rooms:
        return jsonify({"error": "Invalid room code"}), 404
    
    room = game_rooms[room_code]
    
    # Check if player already has an active question
    if user_id in room['active_questions']:
        return jsonify({"error": "You already have an active question"}), 400
    
    try:
        # Get all questions of specified difficulty not yet asked
        cur.execute("""
            SELECT problem_id, title, description, test_cases, solution_template
            FROM coding_problems
            WHERE difficulty = %s
            AND problem_id NOT IN (
                SELECT unnest(%s::uuid[])
            )
            ORDER BY RANDOM()
            LIMIT 1
        """, (difficulty, room['questions_asked']))
        
        question = cur.fetchone()
        
        if question is None:
            # All questions of this difficulty have been asked
            # Reset by removing questions of this difficulty from asked list
            cur.execute("""
                SELECT problem_id
                FROM coding_problems
                WHERE difficulty = %s
            """, (difficulty,))
            
            difficulty_question_ids = [row[0] for row in cur.fetchall()]
            
            # Remove questions of this difficulty from the asked list
            room['questions_asked'] = [q_id for q_id in room['questions_asked'] 
                                     if q_id not in difficulty_question_ids]
            
            # Try again to get a random question
            cur.execute("""
                SELECT problem_id, title, description, test_cases, solution_template
                FROM coding_problems
                WHERE difficulty = %s
                ORDER BY RANDOM()
                LIMIT 1
            """, (difficulty,))
            
            question = cur.fetchone()
        
        problem_id, title, description, test_cases, solution_template = question
        
        # Add to questions asked
        room['questions_asked'].append(problem_id)
        
        # Store active question for this player
        room['active_questions'][user_id] = {
            "problem_id": str(problem_id),
            "title": title,
            "difficulty": difficulty,
            "started_at": request.args.get('timestamp', None)
        }
        
        # Notify other players in room about question selection
        socketio.emit("player_selected_question", {
            "user_id": user_id,
            "question": {
                "title": title,
                "difficulty": difficulty
            }
        }, room=room_code)
        
        return jsonify({
            "problem_id": str(problem_id),
            "title": title,
            "description": description,
            "difficulty": difficulty,
            "test_cases": test_cases,
            "solution_template": solution_template
        }), 200
        
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/skip-question", methods=["POST"])
def skip_question():
    """
    Skip the current active question and lose health based on difficulty
    
    Parameters: room_code, user_id from request JSON
    Dependencies: game_rooms dict, socketio
    Returns: JSON response with success message
    """
    data = request.get_json()
    room_code = data.get("room_code")
    user_id = data.get("user_id")
    
    if not room_code or not user_id:
        return jsonify({"error": "Room code and user_id are required"}), 400
    
    if room_code not in game_rooms:
        return jsonify({"error": "Invalid room code"}), 404
    
    room = game_rooms[room_code]
    
    # Check if player has an active question
    if user_id not in room['active_questions']:
        return jsonify({"error": "No active question to skip"}), 400
    
    # Get difficulty to calculate health penalty
    active_question = room['active_questions'][user_id]
    difficulty = active_question['difficulty']
    
    # Calculate health penalty
    health_penalty = 0
    match difficulty:
        case "easy":
            health_penalty = 5
        case "medium":
            health_penalty = 10
        case "hard":
            health_penalty = 20
    
    # Apply health penalty to current player
    room['health'][user_id] -= health_penalty
    if room['health'][user_id] < 0:
        room['health'][user_id] = 0
    
    # Clear active question
    del room['active_questions'][user_id]
    
    # Emit health update to all players
    socketio.emit("update_player_health", {
        "user_id": user_id,
        "damage": health_penalty,
        "new_health": room['health'][user_id]
    }, room=room_code)
    
    # Emit question skipped event
    socketio.emit("player_answered_question", {
        "user_id": user_id,
        "correct": False,
        "skipped": True
    }, room=room_code)
    
    # Check if game is over
    if room['health'][user_id] <= 0:
        # Find opponent
        opponent_id = None
        for player_id in room['players']:
            if player_id != user_id:
                opponent_id = player_id
                break
        
        if opponent_id:
            # Save game to database
            try:
                cur.execute("""
                    INSERT INTO game_history 
                    (room_code, player1_id, player2_id, winner_id,
                     player1_questions_answered, player2_questions_answered,
                     player1_final_health, player2_final_health)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    room_code, 
                    room['players'][0], 
                    room['players'][1], 
                    opponent_id,
                    room['questions_answered'][room['players'][0]],
                    room['questions_answered'][room['players'][1]],
                    room['health'][room['players'][0]],
                    room['health'][room['players'][1]]
                ))
                conn.commit()
                print(f"Game saved to database: {room_code}, winner: {opponent_id}")
            except psycopg2.Error as e:
                conn.rollback()
                print(f"Error saving game to database: {e}")
            
            # Game over - emit results
            socketio.emit("game_over", {
                "winner_id": opponent_id,
                "loser_id": user_id,
                "questions_answered": room['questions_answered'],
                "final_health": room['health']
            }, room=room_code)
            room['status'] = 'finished'
    
    return jsonify({"message": "Question skipped successfully"}), 200
        
def make_tarfile(file_path, arcname):
    tar_stream = io.BytesIO()
    with tarfile.open(fileobj=tar_stream, mode='w') as tar:
        tar.add(file_path, arcname=arcname)
    tar_stream.seek(0)
    return tar_stream

@app.route("/api/submit-solution", methods=["POST"])
def submit_solution():
    data = request.get_json()
    code = data.get("code")

    tmpdir = os.path.join("/code", f"{uuid.uuid4().hex}")
    os.makedirs(tmpdir, exist_ok=True)

    code_path = os.path.join(tmpdir, "solution.py")
    with open(code_path, "w") as f:
        f.write(code)

    try:
        if 'python:3.11-slim' not in client.images.list():
            client.images.pull("python:3.11-slim")

        container = client.containers.create(
            image="python:3.11-slim",
            command=["python", "/app/solution.py"],
            tty=True,
            working_dir="/app",
            mem_limit='128m',
            nano_cpus=500_000_000,
            network_disabled=True,
            user=1000
        )
        tar_stream = make_tarfile(code_path, "solution.py")
        container.put_archive("/app", tar_stream)
        
        output = container.start()

        try:
            container.wait(timeout=5)
        except Exception:
            container.kill()
            result = b"Timed out"
        else:
            result = container.logs(stdout=True, stderr=True)
        finally:
            container.remove(force=True)
            
        return jsonify({"output": result.decode()}), 200
    
    except docker.errors.ContainerError as e:
        return jsonify({"output": e.stderr.decode()}), 400
    except Exception as e:
        return jsonify({"output": str(e)}), 500
    finally:
        shutil.rmtree(tmpdir)


# Game room storage
game_rooms = {}
# Socket ID to User ID mapping
socket_to_user = {}
# User ID to Socket ID mapping
user_to_socket = {}

def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@app.route("/api/create-room", methods=["POST"])
def create_room():
    """
    Create a new game room
    
    Parameters: user_id from request JSON
    Dependencies: generate_room_code function, game_rooms dict
    Returns: JSON response with room_code
    """
    data = request.get_json()
    user_id = data.get("user_id")
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    
    # Check if user is already in a room
    for room_code, room in game_rooms.items():
        if user_id in room['players']:
            return jsonify({"error": "You are already in a game room"}), 400
    
    room_code = generate_room_code()
    
    # Ensure unique room code
    while room_code in game_rooms:
        room_code = generate_room_code()
    
    game_rooms[room_code] = {
        "creator": user_id,
        "players": [user_id],
        "sockets": {},  # Will be populated when user joins via socket
        "health": {user_id: 100},
        "code": {user_id: ""},
        "questions_answered": {user_id: 0},
        "questions_asked": [],  # Track question IDs already asked
        "active_questions": {},  # Track active question per player
        "status": "waiting",
        "is_random": False
    }
    
    return jsonify({"room_code": room_code}), 201

@app.route("/api/get_all_games", methods=["GET"])
def get_all_games():
    return jsonify(game_rooms)

@app.route("/api/find-random-game", methods=["POST"])
def find_random_game():
    """
    Find random game
    
    Parameters: user_id from request JSON
    Dependencies: generate_room_code function, game_rooms dict
    Returns: JSON response with room_code

    Will first look for open, random room. If no random room, make a new random room. If there is, join it.
    """
    data = request.get_json()
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    # Check if user is already in a room
    for room_code, room in game_rooms.items():
        if user_id in room['players']:
            return jsonify({"error": "You are already in a game room"}), 400

    room_available = None

    for game_room in game_rooms:
        if game_rooms[game_room]["is_random"] and game_rooms[game_room]["status"] == "waiting":
            room_available = game_room
    
    if room_available:
        return jsonify({"created_game": False, "room_code": room_available})
    else:
        room_code = generate_room_code()
        while room_code in game_rooms:
            room_code = generate_room_code()
        game_rooms[room_code] = {
            "creator": user_id,
            "players": [user_id],
            "sockets": {},  # Will be populated when user joins via socket
            "health": {user_id: 100},
            "code": {user_id: ""},
            "questions_answered": {user_id: 0},
            "questions_asked": [],  # Track question IDs already asked
            "active_questions": {},  # Track active question per player
            "status": "waiting",
            "is_random": True
        }
        return jsonify({"created_game": True, "room_code": room_code}), 201        

    return jsonify({"error": "something bad happened"}), 400

@socketio.on('connect')
def handle_connect():
    """
    Handle new socket connections
    
    Parameters: None
    Dependencies: request.sid from flask-socketio
    Returns: None (emits events)
    """
    print(f"Client connected: {request.sid}")
    emit('connected', {'socket_id': request.sid})

@socketio.on('disconnect')
def handle_disconnect():
    """
    Handle socket disconnections and cleanup
    
    Parameters: None
    Dependencies: socket_to_user, user_to_socket, game_rooms
    Returns: None (emits events)
    """
    socket_id = request.sid
    print(f"Client disconnected: {socket_id}")
    
    # Find user associated with this socket
    if socket_id in socket_to_user:
        user_id = socket_to_user[socket_id]
        
        # Clean up mappings
        del socket_to_user[socket_id]
        if user_id in user_to_socket:
            del user_to_socket[user_id]
        
        # Find and update any game rooms the user was in
        for room_code, room in list(game_rooms.items()):
            if user_id in room['players']:
                # Remove player from room
                room['players'].remove(user_id)
                if user_id in room['health']:
                    del room['health'][user_id]
                if user_id in room['code']:
                    del room['code'][user_id]
                if user_id in room['questions_answered']:
                    del room['questions_answered'][user_id]
                if user_id in room['active_questions']:
                    del room['active_questions'][user_id]
                if user_id in room['sockets']:
                    del room['sockets'][user_id]
                
                # Clean up empty rooms
                if len(room['players']) == 0:
                    del game_rooms[room_code]
                    print(f"Room {room_code} deleted - no players remaining")
                else:
                    # Notify remaining players
                    socketio.emit('player_disconnected', {
                        'user_id': user_id,
                        'remaining_players': room['players']
                    }, room=room_code)
                    room['status'] = 'waiting'

@socketio.on('join_game')
def handle_join_game(data):
    """
    Handle player joining a game room via Socket.IO
    
    Parameters: data dict with room_code and user_id
    Dependencies: game_rooms dict, socketio
    Returns: None (emits events)
    """
    room_code = data.get('room_code')
    user_id = data.get('user_id')
    
    if room_code not in game_rooms:
        emit('error', {'message': 'Invalid room code'})
        return
    
    room = game_rooms[room_code]
    
    if len(room['players']) >= 2:
        emit('error', {'message': 'Room is full'})
        return
    
    # Update socket mappings
    socket_id = request.sid
    socket_to_user[socket_id] = user_id
    user_to_socket[user_id] = socket_id
    
    if user_id not in room['players']:
        room['players'].append(user_id)
        room['health'][user_id] = 100
        room['code'][user_id] = ""
        room['questions_answered'][user_id] = 0
    
    # Store socket ID in room
    room['sockets'][user_id] = socket_id
    
    join_room(room_code)
    print(f"User {user_id} (socket: {socket_id}) joined room {room_code}")
    
    # Notify all players in room
    if len(room['players']) == 2:
        room['status'] = 'ready'
        socketio.emit('game_ready', {
            'players': room['players'],
            'health': room['health']
        }, room=room_code)
    else:
        emit('waiting_for_player', {'room_code': room_code})

@socketio.on('code_update')
def handle_code_update(data):
    """
    Handle code editor updates from players
    
    Parameters: data dict with room_code, user_id, and code
    Dependencies: game_rooms dict, socketio
    Returns: None (emits events)
    """
    room_code = data.get('room_code')
    user_id = data.get('user_id')
    code = data.get('code')
    
    if room_code in game_rooms:
        game_rooms[room_code]['code'][user_id] = code
        # Optionally broadcast to other player for spectating
        socketio.emit('opponent_code_update', {
            'user_id': user_id,
            'code': code
        }, room=room_code, skip_sid=request.sid)

@socketio.on('answered-question')
def handle_answered_question(data):
    """
    Handle code editor updates from players
    
    Parameters: data dict with room_code, user_id, and question data
    Dependencies: game_rooms dict, socketio
    Returns: None (emits events)
    """
    room_code = data.get('room_code')
    user_id = data.get('user_id')
    question = data.get('question')
    question_difficulty = question["difficulty"]
    
    if room_code not in game_rooms:
        return
        
    room = game_rooms[room_code]
    
    # Verify player has an active question
    if user_id not in room['active_questions']:
        emit('error', {'message': 'No active question to answer'})
        return
    
    
    question_correct = True # TEMPORARY
    dmg = 0

    if question_correct:
        match (question_difficulty):
            case "easy":
                dmg = 4
            case "medium":
                dmg = 15
            case "hard":
                dmg = 49
            case "_":
                dmg = 0
        
        # Find opponent's user_id
        opponent_id = None
        for player_id in room['players']:
            if player_id != user_id:
                opponent_id = player_id
                break
        
        if opponent_id:
            # Track question answered
            room['questions_answered'][user_id] += 1
            
            # Clear active question for this player
            del room['active_questions'][user_id]
            
            # Notify room that player answered
            socketio.emit("player_answered_question", {
                "user_id": user_id,
                "correct": question_correct
            }, room=room_code)
            
            # Update opponent's health in game state
            room['health'][opponent_id] -= dmg
            if room['health'][opponent_id] < 0:
                room['health'][opponent_id] = 0
            
            # Emit health update to all players in room
            socketio.emit("update_player_health", {
                "user_id": opponent_id,
                "damage": dmg,
                "new_health": room['health'][opponent_id]
            }, room=room_code)
            
            # Check if game is over
            if room['health'][opponent_id] <= 0:
                # Save game to database
                try:
                    cur.execute("""
                        INSERT INTO game_history 
                        (room_code, player1_id, player2_id, winner_id,
                         player1_questions_answered, player2_questions_answered,
                         player1_final_health, player2_final_health)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        room_code, 
                        room['players'][0], 
                        room['players'][1], 
                        user_id,
                        room['questions_answered'][room['players'][0]],
                        room['questions_answered'][room['players'][1]],
                        room['health'][room['players'][0]],
                        room['health'][room['players'][1]]
                    ))
                    conn.commit()
                    print(f"Game saved to database: {room_code}, winner: {user_id}")
                except psycopg2.Error as e:
                    conn.rollback()
                    print(f"Error saving game to database: {e}")
                
                # Game over - emit results
                socketio.emit("game_over", {
                    "winner_id": user_id,
                    "loser_id": opponent_id,
                    "questions_answered": room['questions_answered'],
                    "final_health": room['health']
                }, room=room_code)
                room['status'] = 'finished'


@socketio.on('leave_game')
def handle_leave_game(data):
    """
    Handle player leaving a game room
    
    Parameters: data dict with room_code and user_id
    Dependencies: game_rooms dict, socketio
    Returns: None (emits events)
    """
    room_code = data.get('room_code')
    user_id = data.get('user_id')
    
    if room_code in game_rooms:
        room = game_rooms[room_code]
        
        # Save game to database if it's a 2-player game and someone is leaving
        # Only save if the game hasn't already been saved (i.e., not finished)
        if len(room['players']) == 2 and user_id in room['players'] and room['status'] != 'finished':
            # Determine winner (the player who didn't leave)
            winner_id = room['players'][0] if room['players'][0] != user_id else room['players'][1]
            
            try:
                cur.execute("""
                    INSERT INTO game_history 
                    (room_code, player1_id, player2_id, winner_id,
                     player1_questions_answered, player2_questions_answered,
                     player1_final_health, player2_final_health)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    room_code, 
                    room['players'][0], 
                    room['players'][1], 
                    winner_id,
                    room['questions_answered'].get(room['players'][0], 0),
                    room['questions_answered'].get(room['players'][1], 0),
                    room['health'].get(room['players'][0], 0),
                    room['health'].get(room['players'][1], 0)
                ))
                conn.commit()
                print(f"Game saved to database (player left early): {room_code}, winner: {winner_id}")
            except psycopg2.Error as e:
                conn.rollback()
                print(f"Error saving game to database: {e}")
        
        if user_id in room['players']:
            room['players'].remove(user_id)
            if user_id in room['health']:
                del room['health'][user_id]
            if user_id in room['code']:
                del room['code'][user_id]
            if user_id in room['questions_answered']:
                del room['questions_answered'][user_id]
            if user_id in room['active_questions']:
                del room['active_questions'][user_id]
            
        # Clean up socket mappings
        if user_id in user_to_socket:
            socket_id = user_to_socket[user_id]
            if socket_id in socket_to_user:
                del socket_to_user[socket_id]
            del user_to_socket[user_id]
        
        if user_id in room['sockets']:
            del room['sockets'][user_id]
            
        leave_room(room_code)
        
        if len(room['players']) == 0:
            del game_rooms[room_code]
            print(f"Room {room_code} deleted - no players remaining")
        else:
            socketio.emit('player_left', {'user_id': user_id}, room=room_code)
            room['status'] = 'waiting'

if __name__ == "__main__":
    socketio.run(app, debug=True, host='0.0.0.0', port=5001)
