# test user signup (success, duplicate username, missing fields)
# test login (success, wrong password, non-existent user)
# test password hashing and salt gen

import pytest
from auth import signup, login, hash_password, gen_salt

# Test with real db
# docker run -d --name test-db -p 5433:5432 \
# -e POSTGRES_PASSWORD=testpass postgres

# # Run tests with test database
# DB_HOST=localhost DB_PORT=5433 DB_PASSWORD=testpass \
# pytest tests/test_auth.py

def test_hash_password():
    salt = gen_salt(16)
    assert len(salt) == 32

    password = "test123"
    hashed = hash_password(password, salt)
    assert hashed != password.encode()
    assert hash_password(password, salt) == hashed

def test_signup(client, mock_db):
    mock_conn, mock_cursor = mock_db
    mock_cursor.fetchone.side_effect = [
        [False],    # No user
        ['acde070d-8c4c-4f0d-9d8a-162843c10333']
    ]
    response = client.post('/api/signup', json = {
        'username': 'newuser',
        'password': 'password123'
    })

    assert response.status_code == 201
    assert response.json["message"] == "User registered successfully"
    assert "user_id" in response.json

def test_signup_duplicate(client, mock_db):
    mock_conn, mock_cursor = mock_db
    mock_cursor.fetchone.return_value = [True]  # User exists

    response = client.post('/api/signup', json={
        'username': 'existing',
        'password': 'password123'
    })

    assert response.status_code == 400
    assert b"Username already exists" in response.data

def test_login_success(client, mock_db):
    mock_conn, mock_cursor = mock_db

    salt = gen_salt(16)
    hashed_pw = hash_password('password', salt)

    mock_cursor.fetchone.return_value = (
        'user-uuid-here',
        memoryview(hashed_pw),
        memoryview(salt)
    )
    response = client.post('/api/login', json={
        'username': 'user100',
        'password': 'password'
    })

    assert response.status_code == 200
    assert response.json["message"] == "User logged in successfully"

# do test login_wrong_password, login_nonexistent_user, login_missing_fields, signup_missing_fields
# need memoryview for login test where password/salt bytea columns fetched
