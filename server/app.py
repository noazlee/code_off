from flask import Flask, jsonify
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

@app.route("/api/register", methods=["POST"])
def register() -> None:
    return "Test"

if __name__ == "__main__":
    app.run(debug=True)