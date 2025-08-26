"""
Authentication functions
"""
from flask import jsonify
import hashlib
import binascii
import os
from database import get_db_connection

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
    Handle user signup
    
    Parameters: Flask request object
    Dependencies: database connection
    Returns: JSON response
    """
    pass

def login(request):
    """
    Handle user login
    
    Parameters: Flask request object
    Dependencies: database connection
    Returns: JSON response
    """
    pass
