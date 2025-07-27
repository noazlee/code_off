import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, Typography, Paper } from '@mui/material';
import { theme } from '../constants/theme';

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
                backgroundColor: theme.colors.gray
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
                    minWidth: 300,
                    backgroundColor: theme.colors.gray
                }}
            >
                <Typography variant="h4" component="h1">
                    Join Lobby
                </Typography>
                
                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                    <div style={{ marginBottom: '16px', position: 'relative' }}>
                        <label 
                            style={{
                                position: 'absolute',
                                top: '-8px',
                                left: '12px',
                                backgroundColor: theme.colors.gray,
                                color: theme.colors.primary,
                                fontSize: '12px',
                                fontWeight: '400',
                                padding: '0 4px',
                                zIndex: 1,
                                fontFamily: 'Roboto, Helvetica, Arial, sans-serif'
                            }}
                        >
                            Lobby Code
                        </label>
                        <input
                            type="text"
                            value={lobbyCode}
                            onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                            placeholder="Enter lobby code"
                            maxLength={6}
                            style={{
                                width: '100%',
                                height: '56px',
                                padding: '16.5px 14px',
                                border: `1px solid ${theme.colors.primary}`,
                                borderRadius: '4px',
                                backgroundColor: 'transparent',
                                color: 'white',
                                fontSize: '16px',
                                fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = theme.colors.textLight;
                                e.target.previousElementSibling.style.color = theme.colors.textLight;
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = theme.colors.primary;
                                e.target.previousElementSibling.style.color = theme.colors.primary;
                            }}
                            onMouseEnter={(e) => {
                                if (document.activeElement !== e.target) {
                                    e.target.style.borderColor = theme.colors.textLight;
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (document.activeElement !== e.target) {
                                    e.target.style.borderColor = theme.colors.primary;
                                }
                            }}
                        />
                    </div>
                    
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