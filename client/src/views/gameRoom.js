import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import io from 'socket.io-client';
import WaitingModal from '../components/WaitingModal';
import HealthBar from '../components/HealthBar';
import Timer from '../components/Timer';
import ImageOverlay from '../components/ImageOverlay';
import { SOCKET_HOST, API_ENDPOINTS } from '../config/api';
import { theme } from '../constants/theme';

function GameRoom() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user_id, isCreator, roomCode: passedRoomCode } = location.state || {};
    
    const [socket, setSocket] = useState(null);
    const [roomCode, setRoomCode] = useState(passedRoomCode || '');
    const [waitingForPlayer, setWaitingForPlayer] = useState(true);
    const [players, setPlayers] = useState([]);
    const [health, setHealth] = useState({});
    const [myCode, setMyCode] = useState('# Write your solution here\n');
    const [opponentCode, setOpponentCode] = useState('');
    const [isSpectator, setSpectator] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [error, setError] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [myActiveQuestion, setMyActiveQuestion] = useState(null);
    const [opponentActiveQuestion, setOpponentActiveQuestion] = useState(null);
    const [roomCreationAttempted, setRoomCreationAttempted] = useState(false);

    const [gameStartTime, setGameStartTime] = useState(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');
    const [answerMessage, setAnswerMessage] = useState('');
    const [playerUsernames, setPlayerUsernames] = useState({});
    const [showImageOverlay, setShowImageOverlay] = useState(false);
    const audioRef = useRef(null);
    
    // Use refs to avoid timing issues with state updates
    const isSpectatorRef = useRef(false);
    const playersRef = useRef([]);
    const showImageOverlayRef = useRef(false);
    
    // Timer refs for auto-dismiss alerts
    const errorTimerRef = useRef(null);
    const answerTimerRef = useRef(null);
    const connectionErrorTimerRef = useRef(null);
    
    // Helper function to get username or fallback to user ID
    const getDisplayName = (userId) => {
        return playerUsernames[userId] || userId || 'Unknown';
    };

    // Keep ref in sync with showImageOverlay state
    useEffect(() => {
        showImageOverlayRef.current = showImageOverlay;
    }, [showImageOverlay]);

    // Auto-dismiss errorMessage after 3 seconds
    useEffect(() => {
        if (errorMessage) {
            // Clear any existing timer
            clearTimeout(errorTimerRef.current);
            // Set new timer
            errorTimerRef.current = setTimeout(() => {
                setErrorMessage('');
            }, 2000);
        }
        return () => clearTimeout(errorTimerRef.current);
    }, [errorMessage]);

    // Auto-dismiss answerMessage after 3 seconds
    useEffect(() => {
        if (answerMessage) {
            // Clear any existing timer
            clearTimeout(answerTimerRef.current);
            // Set new timer
            answerTimerRef.current = setTimeout(() => {
                setAnswerMessage('');
            }, 2000);
        }
        return () => clearTimeout(answerTimerRef.current);
    }, [answerMessage]);

    // Auto-dismiss connection error after 3 seconds
    useEffect(() => {
        if (error) {
            // Clear any existing timer
            clearTimeout(connectionErrorTimerRef.current);
            // Set new timer
            connectionErrorTimerRef.current = setTimeout(() => {
                setError(null);
            }, 2000);
        }
        return () => clearTimeout(connectionErrorTimerRef.current);
    }, [error]);

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
                    console.log("Room created with code:", data.room_code);
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

        newSocket.on('joined_as_spectator', (data) => {
            console.info('Joined as spectator', data);
            console.log('Setting spectator state and refs...');
            
            // Set state
            setSpectator(true);
            setWaitingForPlayer(false);
            setPlayers(data.players);
            setHealth(data.health);
            setPlayerUsernames(data.player_usernames || {});
            
            // Update refs immediately for opponent_code_update handler
            isSpectatorRef.current = true;
            playersRef.current = data.players;
            
            console.log('Spectator state set:', {
                spectator_state: true,
                players_state: data.players,
                player_usernames: data.player_usernames,
                spectator_ref: isSpectatorRef.current,
                players_ref: playersRef.current
            });
            
            // Set initial code states for spectators
            if (data.code) {
                Object.entries(data.code).forEach(([uid, code]) => {
                    if (uid === data.players[0]) {
                        setMyCode(code || '# Player 1 code\n');
                    } else if (uid === data.players[1]) {
                        setOpponentCode(code || '# Player 2 code\n');
                    }
                });
            }
            
            // Set active questions if any
            if (data.active_questions) {
                Object.entries(data.active_questions).forEach(([uid, question]) => {
                    if (uid === data.players[0]) {
                        setMyActiveQuestion(question);
                    } else if (uid === data.players[1]) {
                        setOpponentActiveQuestion(question);
                    }
                });
            }
        });

        // Game event listeners
        newSocket.on('waiting_for_player', (data) => {
            setWaitingForPlayer(true);
        });

        newSocket.on('game_ready', (data) => {
            setWaitingForPlayer(false);
            setPlayers(data.players);
            setHealth(data.health);
            setPlayerUsernames(data.player_usernames || {});
            setGameStartTime(data.started_at);
            
            // Update playersRef for potential spectators joining later
            playersRef.current = data.players;
        });

        newSocket.on('opponent_code_update', (data) => {
            console.log('Code update received:', {
                from_user: data.user_id,
                is_spectator_ref: isSpectatorRef.current,
                is_spectator_state: isSpectator,
                current_user: user_id,
                players_ref: playersRef.current,
                players_state: players,
                players_ref_length: playersRef.current.length
            });
            
            if (isSpectatorRef.current && playersRef.current.length >= 2) {
                // For spectators, determine which editor to update based on player
                if (data.user_id === playersRef.current[0]) {
                    console.log('Updating Player 1 code (left editor)');
                    setMyCode(data.code);
                } else if (data.user_id === playersRef.current[1]) {
                    console.log('Updating Player 2 code (right editor)');
                    setOpponentCode(data.code);
                }
            } else if (!isSpectatorRef.current) {
                // For players, update opponent's code if it's not their own
                if (data.user_id !== user_id) {
                    setOpponentCode(data.code);
                }
            } else {
                console.log('Ignoring code update - spectator but players not ready:', playersRef.current);
            }
        });

        newSocket.on("update_player_health", (data) => {
            console.info("updating player health...", data);
            console.log('Health update details:', {
                affected_player: data.user_id,
                new_health: data.new_health,
                damage: data.damage,
                is_spectator: isSpectator,
                current_user: user_id,
                players: players
            });
            
            // Update health state with new health value
            setHealth(prevHealth => {
                const newHealth = {
                    ...prevHealth,
                    [data.user_id]: data.new_health
                };
                console.log('Updated health state:', newHealth);
                return newHealth;
            });
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
        
        newSocket.on("solution-verified", (data) => {
            console.info("Solution verified:", data);
            console.info("Current roomCode:", data.room_code);
            if (data.user_id === user_id && data.correct) {
                // Use room_code from the event data instead of closure
                newSocket.emit('answered-question', {
                    user_id: user_id,
                    room_code: data.room_code,
                    question: data.question,
                    showImageOverlay: showImageOverlayRef.current,
                    correct: true
                });
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
            // Clear any pending timers on component unmount
            clearTimeout(errorTimerRef.current);
            clearTimeout(answerTimerRef.current);
            clearTimeout(connectionErrorTimerRef.current);
        };
    }, [roomCode, user_id]);

    useEffect(() => {
    if (gameStartTime) {
        const updateElapsed = () => {
            setElapsedSeconds(Math.floor(Date.now() / 1000 - gameStartTime));
        };
        updateElapsed();
        const interval = setInterval(updateElapsed, 1000);
        return () => clearInterval(interval);
    }
}, [gameStartTime]);

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

    const handleSubmitSolution = async () => {
        console.log("Submit solution clicked");
        console.log("myActiveQuestion:", myActiveQuestion);
        console.log("currentQuestion:", currentQuestion);
        console.log("roomCode:", roomCode);
        console.log("user_id:", user_id);
        
        if(!myActiveQuestion){
            alert("Please select a question first");
            return;
        }
        
        if(!currentQuestion){
            alert("No active question data");
            return;
        }
        
        try {
            const submitData = { 
                user_id, 
                room_code: roomCode, 
                code: myCode, 
                question_id: currentQuestion.problem_id 
            };
            console.log("Submitting:", submitData);
            
            const response = await fetch(API_ENDPOINTS.submitSolution, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submitData)
            });

            const data = await response.json();
            
            if (response.ok) {
                if (data.passed) {
                    let answerMsg = `Solution correct! All ${data.passed_tests} test cases passed.`;
                    setAnswerMessage(answerMsg);
                    // Clear the current question since it's been solved
                    setCurrentQuestion(null);
                    setMyActiveQuestion(null);
                } else {
                    // Show which test cases failed
                    const failedTests = data.test_results.filter(t => !t.passed);
                    let errorMsg = `Solution incorrect. ${data.passed_tests}/${data.total_tests} test cases passed.\n\n`;
                    
                    failedTests.forEach(test => {
                        errorMsg += `Test ${test.test_case} failed:\n`;
                        errorMsg += `Expected: ${test.expected}\n`;
                        errorMsg += `Got: ${test.actual}\n\n`;
                    });
                    
                    setErrorMessage(errorMsg);
                }
            } else {
                alert(data.error || 'Failed to submit solution');
            }
        } catch (error) {
            console.error('Error submitting solution:', error);
            alert('Failed to submit solution');
        }
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
                problem_id: question_data.problem_id,
                title: question_data.title,
                difficulty: question_data.difficulty
            });

            handleCodeChange(
                (question_data.solution_template || '# Write your solution here\n').replace(/\\n/g, '\n')
            );

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
                problem_id: question_data.problem_id,
                title: question_data.title,
                difficulty: question_data.difficulty
            });
            
            handleCodeChange(
                (question_data.solution_template || '# Write your solution here\n').replace(/\\n/g, '\n')
            );

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
                problem_id: question_data.problem_id,
                title: question_data.title,
                difficulty: question_data.difficulty
            });

            handleCodeChange(
                (question_data.solution_template || '# Write your solution here\n').replace(/\\n/g, '\n')
            );

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

    // Handle hard mode toggle
    const toggleHardMode = () => {
        const newState = !showImageOverlay;
        setShowImageOverlay(newState);
        
        if (newState) {
            // Play audio when turning on hard mode
            if (!audioRef.current) {
                audioRef.current = new Audio('/audio/Tralalero Tralala - The Italian Brainrot Song🐬.mp3');
                audioRef.current.loop = true;
                audioRef.current.volume = 0.5; // Set to 50% volume
            }
            audioRef.current.play().catch(e => {
                console.error('Failed to play audio:', e);
            });
        } else {
            // Stop audio when turning off hard mode
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        }
    };

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const overlayImages = [
        {
            src: '/images/subway-surfers.gif',
            title: 'Subway Surfers',
            description: 'Keep coding while watching!',
            alt: 'Subway Surfers gameplay'
        }
    ];

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            
            <WaitingModal open={waitingForPlayer} roomCode={roomCode} />
            
            <button 
                onClick={handleLeaveGame}
                style={{
                    position: 'fixed',
                    top: '16px',
                    right: '16px',
                    zIndex: 1200,
                    minWidth: 'auto',
                    width: 'auto',
                    height: '48px',
                    padding: '0 16px',
                    fontSize: '16px',
                    fontFamily: 'Cascadia Code',
                    backgroundColor: '#d32f2f',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    '&:hover': {
                        backgroundColor: '#b71c1c'
                    }
                }}
            >
                Leave Game
            </button>

            {/* Hard Mode toggle button */}
            <button
                onClick={toggleHardMode}
                style={{
                    position: 'fixed',
                    top: '16px',
                    left: '16px',
                    zIndex: 1200,
                    minWidth: 'auto',
                    width: 'auto',
                    height: '48px',
                    padding: '0 16px',
                    fontSize: '16px',
                    fontFamily: 'Cascadia Code',
                    backgroundColor: showImageOverlay ? '#d32f2f' : '#2e7d32',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                {showImageOverlay ? 'HARD MODE ON' : 'HARD MODE: DO 10% MORE DAMAGE'}
            </button>
            
            {/* Image overlay */}
            <ImageOverlay
                open={showImageOverlay}
                onClose={() => setShowImageOverlay(false)}
                images={overlayImages}
            />
            
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
            
            {/* Solution error messages */}
            {errorMessage && (
                <Box sx={{ 
                    position: 'fixed', 
                    top: 120, 
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    maxWidth: '80%',
                    width: 'auto'
                }}>
                    <Alert 
                        severity="error" 
                        onClose={() => setErrorMessage('')}
                        sx={{ 
                            backgroundColor: theme.colors.gray,
                            whiteSpace: 'pre-line',
                            maxHeight: '300px',
                            overflow: 'auto'
                        }}
                    >
                        {errorMessage}
                    </Alert>
                </Box>
            )}

            {/* Answer messages */}
            {answerMessage && (
                <Box sx={{ 
                    position: 'fixed', 
                    top: 120, 
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    maxWidth: '80%',
                    width: 'auto'
                }}>
                    <Alert 
                        severity="success"
                        onClose={() => setAnswerMessage('')}
                        sx={{ 
                            whiteSpace: 'pre-line',
                            maxHeight: '300px',
                            overflow: 'auto',
                            backgroundColor: theme.colors.gray,
                        }}
                    >
                        {answerMessage}
                    </Alert>
                </Box>
            )}

        
            
            {/* Header with health bars */}
            <Box sx={{ p: 2, backgroundColor: theme.colors.gray, height: "12%" }}>
                <Typography variant="h5" align="center" gutterBottom sx={{ fontFamily: 'Cascadia Code' }}>
                    Code Battle - Room: {roomCode} {isSpectator && '(Spectating)'}
                </Typography>
                
                {!waitingForPlayer && (
                    <Box sx={{ display: 'flex', gap: 4, justifyContent: 'center', height: "85%" }}>
                        <Box sx={{ flex: 1, maxWidth: 400 }}>
                            <HealthBar 
                                playerName={isSpectator ? getDisplayName(players[0]) : "You"} 
                                health={health[isSpectator ? players[0] : user_id] || 100} 
                            />
                        </Box>
                        <Box sx={{ flex: 1, maxWidth: 400 }}>
                            <HealthBar 
                                playerName={isSpectator ? getDisplayName(players[1]) : getDisplayName(players.find(p => p !== user_id))} 
                                health={health[isSpectator ? players[1] : players.find(p => p !== user_id)] || 100} 
                            />
                        </Box>
                    </Box>
                )}
            </Box>

            

            {/* Current Question Display */}
            {currentQuestion && (
                <Box sx={{ p: 2, backgroundColor: theme.colors.gray, height:"10%", width: "70%", marginLeft: "auto", marginRight: "auto" }}>
                    <Typography variant="p" gutterBottom sx={{ fontFamily: 'Cascadia Code' }}>
                        Current Question: {currentQuestion.title}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1, height:"auto", fontSize:"15px", fontFamily: 'Cascadia Code' }}>
                        Difficulty: <strong>{currentQuestion.difficulty}</strong>
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', height:"auto", fontSize:"15px", fontFamily: 'Cascadia Code' }}>
                        {currentQuestion.description}
                    </Typography>
                </Box>
            )}

            {/* Question selection prompt */}
            {!isSpectator && !currentQuestion && (
                                <Box sx={{ 
                                    mt: 2, 
                                    p: 2, 
                                    backgroundColor: theme.colors.gray, 
                                    minHeight: '80px',
                                    width: "70%",
                                    textAlign: 'center',
                                    zIndex: 1000,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    pointerEvents: 'none',
                                    marginLeft: 'auto',
                                    marginRight: 'auto'
                                }}>
                                    <Typography variant="h6" sx={{ color: '#856404', mb: 1, fontFamily: 'Cascadia Code' }}>
                                        Choose an attack!
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#856404', fontFamily: 'Cascadia Code' }}>
                                        Select Light, Medium, or Heavy attack to get a coding challenge
                                    </Typography>
                                </Box>
                            )}

            {/* Main game area */}
            <Box sx={{ flex: 1, display: 'flex', gap: 2, p: 2 }}>
                {/* Your editor */}
                <Paper sx={{ flex: 1, p: 2, backgroundColor:theme.colors.gray }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontFamily: 'Cascadia Code' }}>
                            {isSpectator ? `${getDisplayName(players[0])}'s Code` : 'Your Code'}
                        </Typography>
                        {!isSpectator && (
                            <button 
                                style={{padding:"10px"}} 
                                onClick={handleSkipQuestion}
                                disabled={!myActiveQuestion}
                            >
                                Skip
                            </button>
                        )}
                        {myActiveQuestion && (
                            <Typography variant="body2" sx={{ color: 'primary.main', fontFamily: 'Cascadia Code' }}>
                                Working on: {myActiveQuestion.title} ({myActiveQuestion.difficulty})
                            </Typography>
                        )}
                    </Box>
                    <Box sx={{ height: 'calc(100% - 100px)', border: '1px solid #ddd' }}>
                        <Editor
                            height="400px"
                            defaultLanguage="python"
                            theme="vs-dark"
                            value={myCode}
                            onChange={isSpectator ? undefined : handleCodeChange}
                            options={{
                                readOnly: isSpectator,
                                minimap: { enabled: false },
                                fontSize: 14
                            }}
                        />
                    </Box>
                    {!isSpectator ? (
                        <div>
                            
                            <div style={{display: "flex", width: "100%", height:60}}>
                                <button 
                                    onClick={handleSubmitSolution}
                                    style={{ 
                                        marginTop: '16px',
                                        flex: 1, 
                                        marginLeft: '8px', 
                                        marginRight: '8px', 
                                        fontFamily: 'Cascadia Code',
                                        backgroundColor: '#2c2c2c',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '8px 16px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Submit Solution
                                </button>
                                <button 
                                    onClick={handleEasySolution}
                                    style={{ 
                                        marginTop: '16px',
                                        flex: 1, 
                                        marginLeft: '8px', 
                                        marginRight: '8px', 
                                        fontFamily: 'Cascadia Code',
                                        backgroundColor: '#1b4332',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '8px 16px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Light
                                </button>
                                <button 
                                    onClick={handleMediumSolution}
                                    style={{ 
                                        marginTop: '16px',
                                        flex: 1, 
                                        marginLeft: '8px', 
                                        marginRight: '8px', 
                                        fontFamily: 'Cascadia Code',
                                        backgroundColor: '#995d00',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '8px 16px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Medium
                                </button>
                                <button 
                                    onClick={handleHardSolution}
                                    style={{ 
                                        marginTop: '16px',
                                        flex: 1, 
                                        marginLeft: '8px', 
                                        marginRight: '8px', 
                                        fontFamily: 'Cascadia Code',
                                        backgroundColor: '#7f1d1d',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '8px 16px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Heavy
                                </button>
                            </div>
                        </div>
                    ) : (
                        <Box sx={{ mt: 2, p: 2, textAlign: 'center', backgroundColor: theme.colors.gray }}>
                            <Typography variant="body1" sx={{ fontFamily: 'Cascadia Code', color: theme.colors.primary }}>
                                You are spectating this game
                            </Typography>
                        </Box>
                    )}
                </Paper>

                {/* Opponent's editor (read-only) */}
                <Paper sx={{ flex: 1, p: 2, backgroundColor:theme.colors.gray }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontFamily: 'Cascadia Code' }}>
                            {isSpectator ? `${getDisplayName(players[1])}'s Code` : `${getDisplayName(players.find(p => p !== user_id))}'s Code`}
                        </Typography>
                        {opponentActiveQuestion && (
                            <Typography variant="body2" sx={{ color: 'secondary.main', fontFamily: 'Cascadia Code' }}>
                                Working on: {opponentActiveQuestion.title} ({opponentActiveQuestion.difficulty})
                            </Typography>
                        )}
                    </Box>
                    <Box sx={{ height: 'calc(100% - 100px)', border: '1px solid #ddd' }}>
                        <Editor
                            height="400px"
                            defaultLanguage="python"
                            theme="vs-dark"
                            value={opponentCode}
                            options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                fontSize: 14
                            }}
                        />
                    </Box>
                    <Timer elapsedSeconds={elapsedSeconds}/>
                </Paper>
            </Box>
        </Box>
    );
}

export default GameRoom;