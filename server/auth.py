"""
Authentication functions
"""
from flask import jsonify
import hashlib
import binascii
import os
from database import get_db_connection, return_db_connection
import psycopg2

def gen_salt(size: int) -> bytes:
    """
    Generate salt for password hashing
    
    Parameters: size - number of bytes
    Dependencies: os
    Returns: salt bytes
    """
    return binascii.hexlify(os.urandom(size))

def hash_password(password: str, b_salt: bytes) -> bytes:
    """
    Hash password with salt
    
    Parameters: password string, salt bytes
    Dependencies: hashlib
    Returns: hashed password bytes
    """
    sha256 = hashlib.sha256()
    sha256.update(password.encode())
    sha256.update(b_salt)
    return sha256.hexdigest().encode()

def signup(request):
    """
    Parameters: Flask request object
    Dependencies: database connection
    Returns: JSON response
    """
    if request.method != "POST":
        raise Exception("Invalid method")
        
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    
    conn = get_db_connection()

    try:
        cur = conn.cursor()

        # Check if username already exists
        cur.execute("SELECT EXISTS(SELECT 1 FROM users WHERE username = %s)", (username,))
        conn.commit()
        exists = cur.fetchone()[0]
        if exists:
            return jsonify({"error": "Username already exists"}), 400

        salt = gen_salt(16)
        hashed_password = hash_password(password, salt)

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
    finally:
        return_db_connection(conn)


def login(request):
    """
    Parameters: Flask request object
    Dependencies: database connection
    Returns: JSON response
    """
    if request.method != "POST":
        raise Exception("Must be POST request")

    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    
    conn = get_db_connection()

    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT user_id, password, salt FROM users WHERE username = %s",
            (username,)
        )
        conn.commit()
        user = cur.fetchone()

        if user is None:
            return jsonify({"error": "Invalid username or password"}), 401
        
        user_id, stored_password, salt = user
        stored_password = stored_password.tobytes()
        salt = salt.tobytes()
        hashed_password = hash_password(password, salt)

        if hashed_password == stored_password:
            return jsonify({"message": "User logged in successfully",
                            "user_id": str(user_id)}), 200
        else:
            return jsonify({"error": "Invalid username or password"}), 401
            
    except psycopg2.Error as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        return_db_connection(conn)
