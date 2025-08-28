"""
Main Flask application entry point
"""
from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Import modules
from auth import signup, login
# from game import (create_room, get_question, skip_question,
#                 submit_solution, find_random_game, get_all_games)
# from api import get_leaderboard, get_game_history, get_player_count
# from sockets import register_socket_handlers
from database import init_db

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'MaSz55vnLfTAN5cG')

# Initialize extensions
CORS(app, supports_credentials=True, origins="*")
socketio = SocketIO(app, cors_allowed_origins="*")

# register_socket_handlers(socketio)

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"message": "yo", "status": "healthy"})

# Auth routes
@app.route("/api/signup", methods=["POST"])
def signup_route():
    return signup(request)

@app.route("/api/login", methods=["POST"])
def login_route():
    return login(request)

# Game routes
# @app.route("/api/create-room", methods=["POST"])
# def create_room_route():
#     return create_room(request)

# @app.route("/api/get-question", methods=["POST"])
# def get_question_route():
#     return get_question(request)

# @app.route("/api/skip-question", methods=["POST"])
# def skip_question_route():
#     return skip_question(request, socketio)

# @app.route("/api/submit-solution", methods=["POST"])
# def submit_solution_route():
#     return submit_solution(request, socketio)

# @app.route("/api/find-random-game", methods=["POST"])
# def find_random_game_route():
#     return find_random_game(request)

# @app.route("/api/get_all_games", methods=["GET"])
# def get_all_games_route():
#     return get_all_games()

# API routes
# @app.route("/api/leaderboard", methods=["GET"])
# def leaderboard_route():
#     return get_leaderboard()

# @app.route("/api/game-history", methods=["GET"])
# def game_history_route():
#     return get_game_history(request)

# @app.route("/api/get-player-count", methods=["GET"])
# def player_count_route():
#     return get_player_count()

if __name__ == "__main__":
    init_db()
    socketio.run(app, debug=True, host='0.0.0.0', port=5001)