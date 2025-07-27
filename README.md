# Code Duels - Real-time Competitive Programming Game

A multiplayer competitive programming game where players battle by solving coding challenges in real-time. Players take damage when their opponent solves problems correctly, with harder problems dealing more damage.

## Game Overview

Players compete in 1v1 battles where they:
- Select coding problems of varying difficulty (Easy, Medium, Hard)
- Write Python solutions in real-time
- Deal damage to opponents by solving problems correctly
- Win by reducing opponent's health to zero

## Tech Stack

**Frontend:**
- React.js with React Router
- Material-UI for components
- Monaco Editor for code editing
- Socket.io-client for real-time communication

**Backend:**
- Flask with Flask-SocketIO
- PostgreSQL for data persistence
- Docker for secure code execution
- Python for solution verification

## Solution Verifier

The solution verifier is a critical component that ensures players' code solutions are correct before dealing damage to opponents.

### How It Works

```
1. Player submits code solution
2. Backend receives code and problem_id
3. Test cases are fetched from database
4. Code is executed in isolated Docker container for each test case
5. Output is compared with expected results
6. If all tests pass, damage is dealt to opponent
```

### Test Case Structure

Test cases are stored in the PostgreSQL database as JSONB:

```json
[
  {
    "input": {"n": 5},
    "expected_output": "120"
  },
  {
    "input": {"n": 0},
    "expected_output": "1"
  }
]
```

### Verification Process

1. **Test Case Retrieval**
   ```python
   def get_test_cases(question_id):
       cur.execute("SELECT test_cases FROM coding_problems WHERE problem_id = %s", (question_id,))
       return cur.fetchone()[0]  # Returns JSONB test cases
   ```

2. **Code Execution**
   - Each test case runs in an isolated Docker container
   - Memory limit: 128MB
   - CPU limit: 0.5 cores
   - Timeout: 5 seconds
   - Network disabled for security

3. **Solution Wrapper**
   The verifier automatically handles both function-based and print-based solutions:
   
   ```python
   # Function-based solution
   def factorial(n):
       if n <= 1:
           return 1
       return n * factorial(n-1)
   
   # Automatically wrapped to:
   # print(factorial(5))
   ```

4. **Result Comparison**
   - Output is stripped of whitespace
   - Exact string match required
   - All test cases must pass for success

### API Endpoint

**POST /api/submit-solution**

Request:
```json
{
  "code": "def factorial(n):\n    return 1 if n <= 1 else n * factorial(n-1)",
  "question_id": "uuid-here",
  "room_code": "ABC123",
  "user_id": "user-uuid"
}
```

Response (Success):
```json
{
  "passed": true,
  "test_results": [
    {
      "test_case": 1,
      "input": {"n": 5},
      "expected": "120",
      "actual": "120",
      "passed": true
    }
  ],
  "total_tests": 2,
  "passed_tests": 2
}
```

Response (Failure):
```json
{
  "passed": false,
  "test_results": [
    {
      "test_case": 1,
      "input": {"n": 5},
      "expected": "120",
      "actual": "1",
      "passed": false
    }
  ],
  "total_tests": 2,
  "passed_tests": 0
}
```

### Integration with Game Mechanics

1. When solution passes all tests:
   - `solution-verified` event is emitted via Socket.IO
   - Client emits `answered-question` event
   - Server calculates damage based on difficulty:
     - Easy: 4 damage
     - Medium: 15 damage
     - Hard: 49 damage
   - Opponent's health is reduced
   - UI updates in real-time

2. When solution fails:
   - Detailed error feedback shown to player
   - No damage dealt
   - Player can retry or skip question

## Setup Instructions

### Prerequisites
- Docker and Docker Compose
- Node.js (v14+)
- PostgreSQL (handled by Docker)

### Server Setup

1. Navigate to server directory:
   ```bash
   cd server
   ```

2. Start with Docker Compose:
   ```bash
   docker-compose up
   ```

This starts:
- Flask API server on port 5001
- PostgreSQL database on port 5432
- Redis (if needed) for session management

### Client Setup

1. Navigate to client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```
   REACT_APP_API_URL=http://localhost:5001
   ```

4. Start development server:
   ```bash
   npm start
   ```

Client runs on http://localhost:3000
