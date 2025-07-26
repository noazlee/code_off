# Socket.IO Implementation Guide

## Overview

This document explains how Socket.IO connections work in the Code Battle application, including when socket IDs are assigned, how the connection flow works, and how rooms are managed.

## Connection Flow

### 1. Client Connection
When a client connects to the Socket.IO server:

```javascript
// Client side (gameRoom.js)
const newSocket = io('http://localhost:5001');
```

### 2. Socket ID Assignment
- **When**: Socket ID is assigned immediately upon connection
- **Where**: Server automatically generates a unique ID
- **Access**: Available as `request.sid` on server, emitted to client

```python
# Server side (app.py)
@socketio.on('connect')
def handle_connect():
    socket_id = request.sid  # Unique socket ID
    emit('connected', {'socket_id': socket_id})
```

### 3. User-Socket Mapping
The server maintains bidirectional mappings:
- `socket_to_user`: Maps socket ID → user ID
- `user_to_socket`: Maps user ID → socket ID

This happens when a user joins a game:
```python
socket_to_user[socket_id] = user_id
user_to_socket[user_id] = socket_id
```

## Room Management

### Creating a Room
1. User clicks "Create Game"
2. Frontend calls `/api/create-room` endpoint
3. Server generates unique 6-character room code
4. Room is created in `game_rooms` dictionary
5. Creator then joins via Socket.IO

### Joining a Room
1. Player enters room code
2. Frontend connects to Socket.IO
3. Emits `join_game` event with room code and user ID
4. Server:
   - Updates socket mappings
   - Adds player to room
   - Notifies all players in room

### Room Structure
```python
game_rooms[room_code] = {
    "creator": user_id,
    "players": [user_id1, user_id2],
    "sockets": {user_id: socket_id},
    "health": {user_id: 100},
    "code": {user_id: ""},
    "current_problem": None,
    "status": "waiting" | "ready" | "in_progress"
}
```

## Event Flow

### Connection Events
- `connect`: Client connected to server
- `connected`: Server confirms connection with socket ID
- `disconnect`: Client disconnected
- `connect_error`: Connection failed

### Game Events
- `join_game`: Player joins a room
- `waiting_for_player`: Room waiting for second player
- `game_ready`: Both players connected, game can start
- `code_update`: Player's code changed
- `opponent_code_update`: Broadcast opponent's code
- `player_left`: Player voluntarily left
- `player_disconnected`: Player connection lost

## Disconnection Handling

When a player disconnects:
1. `disconnect` event triggered on server
2. Server looks up user ID from socket ID
3. Removes player from room
4. Cleans up mappings
5. Notifies remaining players
6. Deletes empty rooms

## Error Handling

### Common Issues
1. **Invalid Room Code**: Server returns error event
2. **Room Full**: Maximum 2 players per room
3. **Connection Lost**: Client shows disconnection status
4. **Server Unreachable**: Connection error displayed

### Reconnection
- Socket.IO automatically attempts reconnection
- Players need to rejoin rooms after reconnection
- Room state persists if other player remains

## Best Practices

1. **Always clean up**: Remove mappings on disconnect
2. **Validate room codes**: Check existence before joining
3. **Handle errors gracefully**: Show user-friendly messages
4. **Monitor connection status**: Display connection state
5. **Test edge cases**: Disconnections, full rooms, etc.

## Debugging Tips

1. **Server logs**: Added print statements for connections
2. **Client console**: Socket events logged
3. **Network tab**: Monitor WebSocket frames
4. **Socket.IO admin UI**: Can be added for monitoring

## Security Considerations

1. **Room codes**: 6-character alphanumeric, case-insensitive
2. **User validation**: Verify user IDs before room operations
3. **Rate limiting**: Consider adding for room creation
4. **Input sanitization**: Validate all client inputs