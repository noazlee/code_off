from flask import Flask, jsonify
from flask_cors import CORS     # cross origin resource sharing

app = Flask(__name__)
CORS(app)

@app.route("/test")
def main():
    return "Test"

if __name__ == "__main__":
    app.run(debug=True)
