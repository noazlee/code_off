import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';

function HealthBar({ playerName, health, maxHealth = 100 }) {
    const healthPercentage = (health / maxHealth) * 100;
    
    const getHealthColor = () => {
        if (healthPercentage > 60) return '#4caf50';
        if (healthPercentage > 30) return '#ff9800';
        return '#f44336';
    };

    return (
        <Box sx={{ width: '100%', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
                {playerName}: {health}/{maxHealth} HP
            </Typography>
            <LinearProgress
                variant="determinate"
                value={healthPercentage}
                sx={{
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                        backgroundColor: getHealthColor(),
                        borderRadius: 10,
                        transition: 'all 0.3s ease'
                    }
                }}
            />
        </Box>
    );
}

export default HealthBar;