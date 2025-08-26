"""
Game logic functions
"""
from flask import jsonify
import random
import string
import time
from database import get_db_connection
from utils import game_rooms, verify_solution_docker

def generate_room_code():
    """Generate 6-character room code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def create_room(request):
    """
    Create a new game room
    
    Parameters: Flask request object
    Dependencies: game_rooms dict
    Returns: JSON response
    """
    pass

def get_question(request):
    """
    Get a question for the game
    
    Parameters: Flask request object
    Dependencies: database, game_rooms
    Returns: JSON response with question
    """
    pass

