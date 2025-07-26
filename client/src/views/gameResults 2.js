import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper } from '@mui/material';

function GameResults() {
    const location = useLocation();
    const navigate = useNavigate();
    const { 
        user_id, 
        winner_id, 
        loser_id, 
        questions_answered, 
        final_health 
    } = location.state ||{};

    const isWinner = user_id === winner_id;
    const myQuestionsAnswered = questions_answered?.[user_id] || 0;
    const opponentQuestionsAnswered = questions_answered?.[user_id === winner_id ? loser_id : winner_id] || 0;

    const handleGoHome = () => {
        navigate('/home', { state: { user_id } });
    };

    return (
        <Box sx={{ 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f5f5f5'
        }}>
            <Paper sx={{ p: 4, maxWidth: 600, width: '90%' }}>
                <Typography variant="h3" align="center" gutterBottom>
                    Game Over!
                </Typography>
                
                <Typography 
                    variant="h4" 
                    align="center" 
                    sx={{ 
                        color: isWinner ? 'success.main' : 'error.main',
                        mb: 4
                    }}
                >
                    {isWinner ? 'You Won!' : 'You Lost'}
                </Typography>

                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom>
                        Game Statistics:
                    </Typography>
                    
                    <Box sx={{ ml: 2 }}>
                        <Typography variant="body1" gutterBottom>
                            Your Questions Answered: {myQuestionsAnswered}
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                            Opponent's Questions Answered: {opponentQuestionsAnswered}
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                            Your Final Health: {final_health?.[user_id] || 0} HP
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                            Opponent's Final Health: {final_health?.[user_id === winner_id ? loser_id : winner_id] || 0} HP
                        </Typography>
                    </Box>
                </Box>

                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleGoHome}
                    fullWidth
                    size="large"
                >
                    Return to Home
                </Button>
            </Paper>
        </Box>
    );
}

export default GameResults;