from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
import psycopg2, binascii, os, hashlib, uuid, random, string, tempfile, subprocess

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
        
@app.route("/api/submit-solution", methods=["POST"])
def submit_solution():
    data = request.get_json()
    user_id = data.get("user_id")
    room_code = data.get("room_code")
    code = data.get("code")
    
    # Store the submitted code
    # room['code'][user_id] = code
    
    # Notify other player (if any)
    # socketio.emit('solution_submitted', {
    #    'user_id': user_id,
    #    'code': code
    #}, room=room_code)

    # Create a container to run the submitted code
    # This is a placeholder for actual code execution logic

    with tempfile.TemporaryDirectory() as tmpdir:
        code_path = os.path.join(tmpdir, "solution.py")
        with open(code_path, "w") as f:
            f.write(code)

        cmd = [
            "nsjail",
            "--mode", "o",
            "--chroot", "/sandbox/python",
            "--user", "99999",
            "--group", "99999",
            "--time_limit", "20",
            "--rlimit_as", "128",
            "--disable_proc",
            "--disable_clone_newnet",
            "--bindmount", f"{tmpdir}:/usercode",
            "--",
            "/usr/bin/python3",
            "/usercode/solution.py"
        ]

        result = subprocess.run(
            cmd,
            cwd=tmpdir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=20
        )

        return jsonify({
            'stdout': result.stdout.decode(),
            'stderr': result.stderr.decode(),
            'exit_code': result.returncode,
        })


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
        "current_problem": None,
        "status": "waiting"
    }
    
    return jsonify({"room_code": room_code}), 201

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
        if len(room['players']) == 2 and user_id in room['players']:
            # Determine winner (the player who didn't leave)
            winner_id = room['players'][0] if room['players'][0] != user_id else room['players'][1]
            
            try:
                cur.execute("""
                    INSERT INTO game_history 
                    (room_code, player1_id, player2_id, winner_id)
                    VALUES (%s, %s, %s, %s)
                """, (room_code, room['players'][0], room['players'][1], winner_id))
                conn.commit()
                print(f"Game saved to database: {room_code}, winner: {winner_id}")
            except psycopg2.Error as e:
                conn.rollback()
                print(f"Error saving game to database: {e}")
        
        if user_id in room['players']:
            room['players'].remove(user_id)
            del room['health'][user_id]
            del room['code'][user_id]
            
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
