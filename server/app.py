from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2, binascii, os, hashlib

app = Flask(__name__)
CORS(app)

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

@app.route("/api/signup", methods=["POST"])
def register() -> None:
    if request.method == "POST":
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400

        salt = gen_salt(16)
        hashed_password = hash(password, salt)

        try:
            cur.execute(
                "INSERT INTO users (username, password, salt) VALUES (%s, %s, %s)",
                (username, hashed_password, salt)
            )
            conn.commit()
            return jsonify({"message": "User registered successfully"}), 201
        
        except psycopg2.Error as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)