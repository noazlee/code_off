import React from 'react';
import { Box, Modal, Typography, Paper, CircularProgress } from '@mui/material';
import { theme } from '../constants/theme';

function WaitingModal({ open, roomCode }) {
    return (
        <Modal
            open={open}
            aria-labelledby="waiting-modal"
            aria-describedby="waiting-for-player"
        >
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 400,
                    bgcolor: theme.colors.gray,
                    boxShadow: 24,
                    p: 4,
                    borderRadius: 2,
                    textAlign: 'center'
                }}
            >
                <CircularProgress sx={{ mb: 3 }} />
                <Typography variant="h5" component="h2" gutterBottom>
                    Waiting for another player...
                </Typography>
                <Typography variant="body1" sx={{ mb: 3, color:theme.colors.primary }}>
                    Share this room code with your opponent:
                </Typography>
                <Paper
                    elevation={3}
                    sx={{
                        p: 2,
                        bgcolor: '#f5f5f5',
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        letterSpacing: '0.5rem'
                    }}
                >
                    {roomCode}
                </Paper>
            </Box>
        </Modal>
    );
}

export default WaitingModal;