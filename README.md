# Code Duels - Real-time Competitive Programming Game

A multiplayer competitive programming game where players battle by solving coding challenges in real-time. Players take damage when their opponent solves problems correctly, with harder problems dealing more damage.

## Game Overview

Players compete in 1v1 code duels where they:
- Select coding problems of varying difficulty (Easy, Medium, Hard)
- Write Python solutions in real-time
- Deal damage to opponents by solving problems correctly 
- Turn on hard mode to challenge your focus
- Spectate matches of your friends
- Track your progress
- Win by reducing opponent's health to zero

## Tech Stack

**Frontend:**
- React.js with React Router
- Material-UI for components
- Monaco Editor for code editing
- Socket.io-client for web sockets

**Backend:**
- Flask with Flask-SocketIO
- PostgreSQL for data persistence
- Docker for secure code execution

## Setup Instructions

### Prerequisites
- Docker and Docker Compose
- Node.js 
- PostgreSQL (handled by Docker)

### Setup

1. Navigate to root directory:

2. Start with Docker Compose:
   ```bash
   docker compose up --build
   ```

### Deployment Steps (On Google Cloud)
[blog.](https://blog.miguelgrinberg.com/post/how-to-deploy-a-react--flask-project)
0. Get on GCP terminal
1. npm install -> npm run build (in /client) -> production ready in /build
2. sudo apt-get install nginx
3. 
server {
  listen 80;
  root /home/{name}/code_off/client/build;
  index index.html;

  location / (
    try_files $uri $uri/ = 404;
  )
}
4. sudo apt install libpq-dev python3-dev
5. manually create psql database on server -> using init.sql
6. set up proxy: systemd -> when server starts back up - will run exec
7. gunicorn -k gevent -b 127.0.0.1:5001 app-gunicorn:app

### Acknowledgements:
- https://www.youtube.com/watch?v=3WfegWZzxek&pp=0gcJCfwAo7VqN5tD - hard mode sound track
- https://www.pinterest.com/pin/760897299536844192/ - hard mode visualization
