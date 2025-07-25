from flask import Flask, jsonify
from flask_cors import CORS
import psycopg2

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

@app.route("/test")
def main():
    return "Test"

if __name__ == "__main__":
    app.run(debug=True)