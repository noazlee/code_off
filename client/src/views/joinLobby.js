import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';

function JoinLobby() {
    const [lobbyCode, setLobbyCode] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const { user_id } = location.state || {};

    const handleSubmit = (e) => {
        e.preventDefault();
        if (lobbyCode.trim() && user_id) {
            // Navigate to game room with the code to join
            navigate('/gameRoom', { 
                state: { 
                    user_id, 
                    roomCode: lobbyCode.toUpperCase(),
                    isCreator: false 
                } 
            });
        }
    };

    const handleBack = () => {
        navigate('/home', { state: { user_id } });
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                backgroundColor: '#f5f5f5'
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    padding: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    minWidth: 300
                }}
            >
                <Typography variant="h4" component="h1">
                    Join Lobby
                </Typography>
                
                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                    <TextField
                        fullWidth
                        label="Lobby Code"
                        variant="outlined"
                        value={lobbyCode}
                        onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                        placeholder="Enter lobby code"
                        inputProps={{ maxLength: 6 }}
                        sx={{ marginBottom: 2 }}
                    />
                    
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <Button
                            variant="outlined"
                            onClick={handleBack}
                            sx={{ minWidth: 100 }}
                        >
                            Back
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={!lobbyCode.trim()}
                            sx={{ minWidth: 100 }}
                        >
                            Submit
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Box>
    );
}

export default JoinLobby;