import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import io from 'socket.io-client';
import WaitingModal from '../components/WaitingModal';
import HealthBar from '../components/HealthBar';
import { SOCKET_HOST, API_ENDPOINTS } from '../config/api';

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
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [error, setError] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [myActiveQuestion, setMyActiveQuestion] = useState(null);
    const [opponentActiveQuestion, setOpponentActiveQuestion] = useState(null);
    const [roomCreationAttempted, setRoomCreationAttempted] = useState(false);

    useEffect(() => {
        // Initialize socket connection
        console.log('Connecting to:', SOCKET_HOST);
        const newSocket = io(SOCKET_HOST);
        setSocket(newSocket);

        // Create room if creator and no room code provided
        if (isCreator && !passedRoomCode && !roomCreationAttempted) {
            setRoomCreationAttempted(true);
            fetch(API_ENDPOINTS.createRoom, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id })
            })
            .then(res => {
                if (!res.ok) {
                    // Handle 400 error - might be duplicate call but room could be created
                    if (res.status === 400) {
                        console.warn('Create room returned 400, checking if room exists');
                        return res.json().then(errorData => {
                            // Don't show error if it's just "already in room" - room was likely created
                            if (errorData.error && errorData.error.includes('already in a game room')) {
                                console.log('Room was likely created in previous call, continuing...');
                                return null; // Continue without error
                            }
                            throw new Error(errorData.error || 'Failed to create room');
                        });
                    }
                    throw new Error('Failed to create room');
                }
                return res.json();
            })
            .then(data => {
                if (data && data.room_code) {
                    setRoomCode(data.room_code);
                    // Join the created room
                    newSocket.emit('join_game', { 
                        room_code: data.room_code, 
                        user_id 
                    });
                }
            })
            .catch(error => {
                console.error('Error creating room:', error);
                setError(error.message);
                setRoomCreationAttempted(false); // Allow retry
            });
        } else if (passedRoomCode) {
            // Join existing room (including random games)
            setRoomCode(passedRoomCode);
            newSocket.emit('join_game', {
                room_code: passedRoomCode,
                user_id
            });
        }

        // Connection event listeners
        newSocket.on('connect', () => {
            console.log('Connected to server');
            setConnectionStatus('connected');
            setError(null);
        });

        newSocket.on('connected', (data) => {
            console.log('Socket ID:', data.socket_id);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from server');
            setConnectionStatus('disconnected');
            setError('Lost connection to server');
        });

        newSocket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            setConnectionStatus('error');
            setError('Failed to connect to server');
        });

        // Game event listeners
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

        newSocket.on("update_player_health", (data) => {
            console.info("updating player health...", data);
            // Update health state with new health value
            setHealth(prevHealth => ({
                ...prevHealth,
                [data.user_id]: data.new_health
            }));
        })
        
        newSocket.on("game_over", (data) => {
            console.info("Game over!", data);
            // Navigate to results screen
            navigate('/gameResults', { 
                state: { 
                    user_id,
                    winner_id: data.winner_id,
                    loser_id: data.loser_id,
                    questions_answered: data.questions_answered,
                    final_health: data.final_health
                } 
            });
        })
        
        newSocket.on("player_selected_question", (data) => {
            console.info("Player selected question:", data);
            if (data.user_id !== user_id) {
                // Opponent selected a question
                setOpponentActiveQuestion(data.question);
                console.info(data.question);
            }
        })
        
        newSocket.on("player_answered_question", (data) => {
            console.info("Player answered question:", data);
            if (data.user_id === user_id) {
                // I answered my question
                setMyActiveQuestion(null);
            } else {
                // Opponent answered their question
                setOpponentActiveQuestion(null);
            }
        })

        newSocket.on('player_left', (data) => {
            setError('Your opponent has left the game');
            setTimeout(() => {
                navigate('/home', { state: { user_id } });
            }, 3000);
        });

        newSocket.on('player_disconnected', (data) => {
            setError('Your opponent disconnected');
            setWaitingForPlayer(true);
            setOpponentCode('');
        });

        newSocket.on('error', (data) => {
            setError(data.message);
        });

        return () => {
            if (newSocket && roomCode && user_id) {
                newSocket.emit('leave_game', { room_code: roomCode, user_id });
                newSocket.disconnect();
            }
        };
    }, [roomCode, user_id]);

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

    const handleLeaveGame = () => {
        if (socket && roomCode) {
            socket.emit('leave_game', {
                room_code: roomCode,
                user_id: user_id
            });
        }
        // Navigate after a short delay
        setTimeout(() => {
            if (socket) {
                socket.disconnect();
            }
            navigate("/home", { state: { user_id } });
        }, 100);
    }

    const handleSubmitSolution = () => {
        setTimeout(async () => {
            const response = await fetch(API_ENDPOINTS.submitSolution, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id, room_code: roomCode, code: myCode })
            });

            const data = await response.json();
            alert(data.output);
        }, 1000);
    };

    const handleSkipQuestion = async () => {
        if (!myActiveQuestion) {
            alert('No active question to skip');
            return;
        }

        try {
            const response = await fetch(API_ENDPOINTS.skipQuestion, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    room_code: roomCode, 
                    user_id: user_id 
                })
            });

            if (!response.ok) {
                const error = await response.json();
                alert(error.error || 'Failed to skip question');
                return;
            }

            // Clear question states
            setCurrentQuestion(null);
            setMyActiveQuestion(null);
            
        } catch (error) {
            console.error('Error skipping question:', error);
            alert('Failed to skip question');
        }
    };

    const handleEasySolution = async () => {
        try {
            const response = await fetch(API_ENDPOINTS.getQuestion, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    room_code: roomCode, 
                    difficulty: 'easy',
                    user_id: user_id
                })
            });

            if (!response.ok) {
                const error = await response.json();
                alert(error.error || 'Failed to get question');
                return;
            }

            const question_data = await response.json();
            
            // Display question to user
            setCurrentQuestion(question_data);
            setMyActiveQuestion({
                title: question_data.title,
                difficulty: question_data.difficulty
            });
            console.log('Got question:', question_data);



            // For now, simulate answering correctly - remove this - handle logic in submit button
            // socket.emit('answered-question', {
            //     user_id: user_id,
            //     room_code: roomCode,
            //     question: question_data,
            // });
            
            console.info("pressing easy");
        } catch (error) {
            console.error('Error getting question:', error);
            alert('Failed to get question');
        }
    };

    const handleMediumSolution = async () => {
        try {
            const response = await fetch(API_ENDPOINTS.getQuestion, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    room_code: roomCode, 
                    difficulty: 'medium',
                    user_id: user_id
                })
            });

            if (!response.ok) {
                const error = await response.json();
                alert(error.error || 'Failed to get question');
                return;
            }

            const question_data = await response.json();
            
            // Display question to user
            setCurrentQuestion(question_data);
            setMyActiveQuestion({
                title: question_data.title,
                difficulty: question_data.difficulty
            });
            console.log('Got question:', question_data);

            // For now, simulate answering correctly
            // socket.emit('answered-question', {
            //     user_id: user_id,
            //     room_code: roomCode,
            //     question: question_data,
            // });
            
            console.info("pressing medium");
        } catch (error) {
            console.error('Error getting question:', error);
            alert('Failed to get question');
        }
    };

    const handleHardSolution = async () => {
        try {
            const response = await fetch(API_ENDPOINTS.getQuestion, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    room_code: roomCode, 
                    difficulty: 'hard',
                    user_id: user_id
                })
            });

            if (!response.ok) {
                const error = await response.json();
                alert(error.error || 'Failed to get question');
                return;
            }

            const question_data = await response.json();
            
            // Display question to user
            setCurrentQuestion(question_data);
            setMyActiveQuestion({
                title: question_data.title,
                difficulty: question_data.difficulty
            });
            console.log('Got question:', question_data);

            // For now, simulate answering correctly
            // socket.emit('answered-question', {
            //     user_id: user_id,
            //     room_code: roomCode,
            //     question: question_data,
            // });
            
            console.info("pressing hard");
        } catch (error) {
            console.error('Error getting question:', error);
            alert('Failed to get question');
        }
    };

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <WaitingModal open={waitingForPlayer} roomCode={roomCode} />
            
            {/* Connection status indicator */}
            {connectionStatus !== 'connected' && (
                <Box sx={{ 
                    position: 'fixed', 
                    top: 10, 
                    right: 10, 
                    bgcolor: connectionStatus === 'error' ? 'error.main' : 'warning.main',
                    color: 'white',
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    zIndex: 1000
                }}>
                    {connectionStatus === 'connecting' && 'Connecting...'}
                    {connectionStatus === 'disconnected' && 'Disconnected'}
                    {connectionStatus === 'error' && 'Connection Error'}
                </Box>
            )}
            
            {/* Error messages */}
            {error && (
                <Box sx={{ 
                    position: 'fixed', 
                    top: 60, 
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bgcolor: 'error.main',
                    color: 'white',
                    px: 3,
                    py: 2,
                    borderRadius: 1,
                    zIndex: 1000
                }}>
                    {error}
                </Box>
            )}
            
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
                <button variant="contained" color="primary" onClick={handleLeaveGame} sx={{ mt: 2 }} fullWidth>Leave Game</button>
            </Box>

            {/* Current Question Display */}
            {currentQuestion && (
                <Box sx={{ p: 2, backgroundColor: '#e3f2fd', height:"10%" }}>
                    <Typography variant="p" gutterBottom>
                        Current Question: {currentQuestion.title}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1, height:"auto", fontSize:"10px" }}>
                        Difficulty: <strong>{currentQuestion.difficulty}</strong>
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', height:"auto", fontSize:"10px" }}>
                        {currentQuestion.description}
                    </Typography>
                </Box>
            )}

            {/* Main game area */}
            <Box sx={{ flex: 1, display: 'flex', gap: 2, p: 2 }}>
                {/* Your editor */}
                <Paper sx={{ flex: 1, p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                            Your Code
                        </Typography>
                        <button 
                            style={{padding:"10px"}} 
                            onClick={handleSkipQuestion}
                            disabled={!myActiveQuestion}
                        >
                            Skip
                        </button>
                        {myActiveQuestion && (
                            <Typography variant="body2" sx={{ color: 'primary.main' }}>
                                Working on: {myActiveQuestion.title} ({myActiveQuestion.difficulty})
                            </Typography>
                        )}
                    </Box>
                    <Box sx={{ height: 'calc(100% - 100px)', border: '1px solid #ddd' }}>
                        <Editor
                            height="400px"
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
                    <div style={{display: "flex", width: "100%", height:60}}>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={handleSubmitSolution}
                        sx={{ mt: 2 , flex: 1, width: "auto", marginLeft: 1, marginRight: 1}}
                    >
                        Submit Solution
                    </Button>
                    <Button 
                        variant="contained" 
                        color="secondary" 
                        onClick={handleEasySolution}
                        sx={{ mt: 2 , flex: 1, width: "auto", marginLeft: 1, marginRight: 1}}
                    >
                        Easy
                    </Button>
                    <Button 
                        variant="contained" 
                        color="secondary" 
                        onClick={handleMediumSolution}
                        sx={{ mt: 2 , flex: 1, width: "auto", marginLeft: 1, marginRight: 1}}
                    >
                        Medium
                    </Button>
                    <Button 
                        variant="contained" 
                        color="secondary" 
                        onClick={handleHardSolution}
                        sx={{ mt: 2 , flex: 1, width: "auto", marginLeft: 1, marginRight: 1}}
                    >
                        Hard
                    </Button>
                    </div>
                </Paper>

                {/* Opponent's editor (read-only) */}
                <Paper sx={{ flex: 1, p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                            Opponent's Code
                        </Typography>
                        {opponentActiveQuestion && (
                            <Typography variant="body2" sx={{ color: 'secondary.main' }}>
                                Working on: {opponentActiveQuestion.title} ({opponentActiveQuestion.difficulty})
                            </Typography>
                        )}
                    </Box>
                    <Box sx={{ height: 'calc(100% - 100px)', border: '1px solid #ddd' }}>
                        <Editor
                            height="400px"
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