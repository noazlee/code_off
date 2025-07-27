from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
import psycopg2, binascii, os, hashlib, uuid, random, string, tempfile, subprocess, docker, shutil
import tarfile, io, re, time, math

app = Flask(__name__)
app.config['SECRET_KEY'] = 'MaSz55vnLfTAN5cG'
CORS(app, supports_credentials=True, origins="*")
socketio = SocketIO(app, cors_allowed_origins="*")
connected_users = set()

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

def get_usernames_for_ids(user_ids: list) -> dict:
    """
    Get usernames for a list of user IDs
    
    Parameters: user_ids - list of user UUIDs
    Dependencies: database connection (cur)
    Returns: dict mapping user_id to username
    """
    if not user_ids:
        return {}
    
    try:
        # Create placeholder string for IN clause
        placeholders = ','.join(['%s'] * len(user_ids))
        query = f"SELECT user_id, username FROM users WHERE user_id IN ({placeholders})"
        cur.execute(query, user_ids)
        results = cur.fetchall()
        
        # Create mapping dict
        username_mapping = {}
        for user_id, username in results:
            username_mapping[str(user_id)] = username
            
        return username_mapping
    except psycopg2.Error as e:
        print(f"Error fetching usernames: {e}")
        return {}

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

@app.route("/api/get-player-count", methods=["GET"])
def get_player_count():
    return jsonify({"count": len(connected_users)})

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
    question_id = data.get("question_id")
    room_code = data.get("room_code")
    user_id = data.get("user_id")
    
    if not all([code, question_id, room_code, user_id]):
        return jsonify({"error": "Missing required fields"}), 400
    
    # Get test cases from database
    test_cases = get_test_cases(question_id)
    if not test_cases:
        return jsonify({"error": "Question not found"}), 404
    
    tmpdir = os.path.join("/code", f"{uuid.uuid4().hex}")
    os.makedirs(tmpdir, exist_ok=True)

    try:
        # Run code and verify against test cases
        verification_result = verify_solution(code, test_cases, tmpdir)
        
        # Emit socket event based on verification result
        if verification_result["passed"]:
            room = game_rooms.get(room_code)
            if room and user_id in room['active_questions']:
                active_question = room['active_questions'][user_id]
                socketio.emit('solution-verified', {
                    'user_id': user_id,
                    'room_code': room_code,
                    'question': {
                        'problem_id': question_id,
                        'difficulty': active_question['difficulty']
                    },
                    'correct': True
                }, room=room_code)
        
        return jsonify(verification_result), 200
    
    except Exception as e:
        return jsonify({"error": str(e), "passed": False}), 500
    finally:
        if os.path.exists(tmpdir):
            shutil.rmtree(tmpdir)

def get_test_cases(question_id):
    """
    Get test cases for a specific question
    
    Parameters: question_id - UUID of the problem
    Dependencies: database connection
    Returns: list of test cases or None if not found
    """
    try:
        cur.execute("""
            SELECT test_cases FROM coding_problems WHERE problem_id = %s
        """, (question_id,))
        result = cur.fetchone()
        if result:
            return result[0]  # test_cases is stored as JSONB
        return None
    except psycopg2.Error as e:
        print(f"Error fetching test cases: {e}")
        return None

def verify_solution(code, test_cases, tmpdir):
    """
    Verify solution against test cases
    
    Parameters: code, test_cases (list), tmpdir for temporary files
    Dependencies: docker client
    Returns: dict with passed status and details
    """
    results = []
    all_passed = True
    
    for i, test_case in enumerate(test_cases):
        test_input = test_case.get('input', {})
        expected_output = str(test_case.get('expected_output', '')).strip()
        
        # Create test wrapper code
        test_code = create_test_wrapper(code, test_input)
        
        code_path = os.path.join(tmpdir, f"test_{i}.py")
        with open(code_path, "w") as f:
            f.write(test_code)
        
        try:
            # Run test in container
            if 'python:3.11-slim' not in client.images.list():
                client.images.pull("python:3.11-slim")
            
            container = client.containers.create(
                image="python:3.11-slim",
                command=["python", "/app/solution.py"],
                working_dir="/app",
                mem_limit='128m',
                nano_cpus=500_000_000,
                network_disabled=True,
                user=1000
            )
            
            tar_stream = make_tarfile(code_path, "solution.py")
            container.put_archive("/app", tar_stream)
            
            container.start()
            exit_code = container.wait(timeout=5)
            output = container.logs(stdout=True, stderr=True).decode().strip()
            container.remove(force=True)
            
            # Check if output matches expected
            passed = output == expected_output
            if not passed:
                all_passed = False
            
            results.append({
                "test_case": i + 1,
                "input": test_input,
                "expected": expected_output,
                "actual": output,
                "passed": passed
            })
            
        except Exception as e:
            all_passed = False
            results.append({
                "test_case": i + 1,
                "input": test_input,
                "expected": expected_output,
                "actual": str(e),
                "passed": False,
                "error": True
            })
    
    return {
        "passed": all_passed,
        "test_results": results,
        "total_tests": len(test_cases),
        "passed_tests": sum(1 for r in results if r["passed"])
    }

def create_test_wrapper(user_code, test_input):
    """
    Create wrapper code to inject test inputs
    
    Parameters: user_code, test_input dict
    Dependencies: None
    Returns: wrapped code string
    """
    # Check if code uses functions or direct print
    if "def " in user_code:
        # Extract function name
        import re
        func_match = re.search(r'def\s+(\w+)\s*\(', user_code)
        if func_match:
            func_name = func_match.group(1)
            # Build function call with inputs
            if test_input:
                # Convert input dict to function arguments
                args = []
                for key, value in test_input.items():
                    if isinstance(value, str):
                        args.append(f'"{value}"')
                    else:
                        args.append(str(value))
                call_str = f"print({func_name}({', '.join(args)}))"
            else:
                call_str = f"print({func_name}())"
            
            return f"{user_code}\n\n{call_str}"
    
    # For print-based solutions, just return the code
    return user_code

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
        "spectators": [],
        "spectator_sockets": {},
        "health": {user_id: 100},
        "code": {user_id: ""},
        "questions_answered": {user_id: 0},
        "questions_asked": [],  # Track question IDs already asked
        "active_questions": {},  # Track active question per player
        "status": "waiting",
        "is_random": False,
        "start_time": None
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
            "spectators": [],
            "spectator_sockets": {},
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
    connected_users.add(request.sid)
    socketio.emit('player_count_update', {'count': len(connected_users)})
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
    connected_users.discard(socket_id)  # Use discard to avoid KeyError
    socketio.emit('player_count_update', {'count': len(connected_users)})
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
            # Check if user is a spectator first
            if user_id in room['spectators']:
                # Remove spectator from room
                print(f"Spectator {user_id} left room {room_code}")
                room['spectators'].remove(user_id)
                if user_id in room['spectator_sockets']:
                    del room['spectator_sockets'][user_id]
                # Don't emit player_disconnected for spectators
                
            elif user_id in room['players']:
                # Remove actual player from room
                print(f"Player {user_id} disconnected from room {room_code}")
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
                    # Only notify when actual players disconnect
                    socketio.emit('player_disconnected', {
                        'user_id': user_id,
                        'remaining_players': room['players']
                    }, room=room_code)
                    room['status'] = 'waiting' # delete room?
                

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
    
    socket_id = request.sid

    if len(room['players']) >= 2:
        # spectate
        room['spectators'].append(user_id)
        room['spectator_sockets'][user_id] = socket_id
        socket_to_user[socket_id] = user_id
        user_to_socket[user_id] = socket_id
    else:
        # Update socket mappings
        
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
        room['start_time'] = time.time()
        
        # Get usernames for players
        player_usernames = get_usernames_for_ids(room['players'])
        
        socketio.emit('game_ready', {
            'players': room['players'],
            'player_usernames': player_usernames,
            'health': room['health'],
            'started_at': room['start_time']
        }, room=room_code)
    if user_id in room['spectators']:
        # Get usernames for players
        player_usernames = get_usernames_for_ids(room['players'])
        
        # Send current game state to spectator
        emit('joined_as_spectator', {
            'players': room['players'],
            'player_usernames': player_usernames,
            'health': room['health'],
            'spectators': room['spectators'],
            'code': room['code'],  # Send current code state
            'active_questions': {
                uid: {'title': q['title'], 'difficulty': q['difficulty']} 
                for uid, q in room['active_questions'].items()
            }
        })
    if len(room['players']) < 2:
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
        room = game_rooms[room_code]
        
        # Only allow players (not spectators) to update code
        if user_id in room['players']:
            room['code'][user_id] = code
            # Broadcast to all in room (including spectators)
            socketio.emit('opponent_code_update', {
                'user_id': user_id,
                'code': code
            }, room=room_code, skip_sid=request.sid)

@socketio.on('answered-question')
def handle_answered_question(data):
    """
    Handle player answering a question correctly
    
    Parameters: data dict with room_code, user_id, question, and correct
    Dependencies: game_rooms dict, socketio
    Returns: None (emits events)
    """
    room_code = data.get('room_code')
    user_id = data.get('user_id')
    question = data.get('question')
    question_correct = data.get('correct', False)
    hard_mode = data.get('showImageOverlay')
    
    if room_code not in game_rooms:
        return
        
    room = game_rooms[room_code]
    
    # Verify player has an active question
    if user_id not in room['active_questions']:
        emit('error', {'message': 'No active question to answer'})
        return
    
    question_difficulty = question.get("difficulty", "easy")
    dmg = 0

    # Debug logging
    print(f"=== Damage Calculation Debug ===")
    print(f"User ID: {user_id}")
    print(f"Question difficulty: {question_difficulty}")
    print(f"Question correct: {question_correct}")
    print(f"Hard mode received: {hard_mode}")
    print(f"Hard mode type: {type(hard_mode)}")

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

        print(f"Base damage: {dmg}")
        
        if hard_mode:
            original_dmg = dmg
            dmg = int(math.ceil(dmg * 1.1))
            print(f"Hard mode active - damage boosted from {original_dmg} to {dmg}")
        else:
            print(f"Hard mode not active - damage remains {dmg}")
        
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
