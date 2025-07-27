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
