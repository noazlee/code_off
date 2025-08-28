"""
Pytest configuration and fixtures for testing
"""
import pytest
import psycopg2
from unittest.mock import Mock, MagicMock, patch
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app as flask_app, socketio

@pytest.fixture
def app():
    """
    Create and configure a test Flask application

    Parameters: None
    Dependencies: Flask app from main module
    Returns: Configured Flask test app
    """
    flask_app.config.update({
        "TESTING": True,
        "SECRET_KEY": "test-secret-key",
        "WTF_CSRF_ENABLED": False,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"
    })
    yield flask_app

@pytest.fixture
def client(app):
    """
    Create a test client for the Flask application
    
    Parameters: app fixture
    Dependencies: Flask test app
    Returns: Flask test client
    """
    return app.test_client()

@pytest.fixture
def socket_client(app):
    """
    Create a Socket.IO test client
    
    Parameters: app fixture
    Dependencies: Flask app with Socket.IO
    Returns: Socket.IO test client
    """
    return socketio.test_client(app)

@pytest.fixture
def mock_db(monkeypatch):
    """
    Mock database connection and cursor
    
    Parameters: monkeypatch fixture
    Dependencies: None
    Returns: tuple of (mock_conn, mock_cursor)
    """
    mock_conn = Mock()
    mock_cursor = Mock()
    mock_conn.cursor.return_value = mock_cursor
    mock_conn.commit = Mock()
    mock_conn.rollback = Mock()

    # Mock the get_db_connection function
    monkeypatch.setattr('auth.get_db_connection', lambda: mock_conn)
    monkeypatch.setattr('auth.return_db_connection', Mock())

    return mock_conn, mock_cursor

@pytest.fixture
def mock_docker(monkeypatch):
    """
    Mock Docker client for testing code execution
    
    Parameters: monkeypatch fixture
    Dependencies: None
    Returns: Mock docker client
    """
    pass

@pytest.fixture
def sample_user():
    """
    Create a sample user for testing
    
    Parameters: None
    Dependencies: None
    Returns: dict with user data
    """
    pass

@pytest.fixture
def sample_room():
    """
    Create a sample game room for testing
    
    Parameters: None
    Dependencies: None
    Returns: dict with room data
    """
    pass

    
