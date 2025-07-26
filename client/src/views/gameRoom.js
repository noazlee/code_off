import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Box, Typography, Button, Paper } from '@mui/material';
import io from 'socket.io-client';
import WaitingModal from '../components/WaitingModal';
import HealthBar from '../components/HealthBar';

function GameRoom() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user_id, isCreator, roomCode: passedRoomCode } = location.state || {};
    
    const [socket, setSocket] = useState(null);
    const [roomCode, setRoomCode] = useState(passedRoomCode || '');
    const [waitingForPlayer, setWaitingForPlayer] = useState(true);
    const [players, setPlayers] = useState([]);
    const [health, setHealth] = useState({});
    const [myCode, setMyCode] = useState('// Write your solution here\n');
    const [opponentCode, setOpponentCode] = useState('');
    const [problem, setProblem] = useState(null);

    useEffect(() => {
        // Initialize socket connection
        const newSocket = io('http://localhost:5001');
        setSocket(newSocket);

        // Create room if creator
        if (isCreator) {
            fetch('http://localhost:5001/api/create-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id })
            })
            .then(res => res.json())
            .then(data => {
                setRoomCode(data.room_code);
                // Join the created room
                newSocket.emit('join_game', { 
                    room_code: data.room_code, 
                    user_id 
                });
            });
        } else if (passedRoomCode) {
            // Join existing room
            newSocket.emit('join_game', {
                room_code: passedRoomCode,
                user_id
            });
        }

        // Socket event listeners
        newSocket.on('waiting_for_player', (data) => {
            setWaitingForPlayer(true);
        });

        newSocket.on('game_ready', (data) => {
            setWaitingForPlayer(false);
            setPlayers(data.players);
            setHealth(data.health);
        });

        newSocket.on('opponent_code_update', (data) => {
            if (data.user_id !== user_id) {
                setOpponentCode(data.code);
            }
        });

        newSocket.on('player_left', (data) => {
            alert('Your opponent has left the game');
            navigate('/home', { state: { user_id } });
        });

        return () => {
            if (newSocket) {
                newSocket.emit('leave_game', { room_code: roomCode, user_id });
                newSocket.disconnect();
            }
        };
    }, []);

    const handleCodeChange = (value) => {
        setMyCode(value);
        if (socket && roomCode) {
            socket.emit('code_update', {
                room_code: roomCode,
                user_id: user_id,
                code: value
            });
        }
    };

    const handleSubmitSolution = () => {
        // TODO: Implement solution submission logic
        console.log('Submitting solution...');
    };

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <WaitingModal open={waitingForPlayer} roomCode={roomCode} />
            
            {/* Header with health bars */}
            <Box sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                <Typography variant="h4" align="center" gutterBottom>
                    Code Battle - Room: {roomCode}
                </Typography>
                
                {!waitingForPlayer && (
                    <Box sx={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <Box sx={{ flex: 1, maxWidth: 400 }}>
                            <HealthBar 
                                playerName="You" 
                                health={health[user_id] || 100} 
                            />
                        </Box>
                        <Box sx={{ flex: 1, maxWidth: 400 }}>
                            <HealthBar 
                                playerName="Opponent" 
                                health={health[players.find(p => p !== user_id)] || 100} 
                            />
                        </Box>
                    </Box>
                )}
            </Box>

            {/* Main game area */}
            <Box sx={{ flex: 1, display: 'flex', gap: 2, p: 2 }}>
                {/* Your editor */}
                <Paper sx={{ flex: 1, p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Your Code
                    </Typography>
                    <Box sx={{ height: 'calc(100% - 100px)', border: '1px solid #ddd' }}>
                        <Editor
                            height="100%"
                            defaultLanguage="javascript"
                            theme="vs-dark"
                            value={myCode}
                            onChange={handleCodeChange}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14
                            }}
                        />
                    </Box>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={handleSubmitSolution}
                        sx={{ mt: 2 }}
                        fullWidth
                    >
                        Submit Solution
                    </Button>
                </Paper>

                {/* Opponent's editor (read-only) */}
                <Paper sx={{ flex: 1, p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Opponent's Code
                    </Typography>
                    <Box sx={{ height: 'calc(100% - 100px)', border: '1px solid #ddd' }}>
                        <Editor
                            height="100%"
                            defaultLanguage="javascript"
                            theme="vs-dark"
                            value={opponentCode}
                            options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                fontSize: 14
                            }}
                        />
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}

export default GameRoom;