import React, { useState, useEffect } from 'react';
import { 
    Box, 
    IconButton, 
    Modal, 
    Card,
    CardMedia,
    Typography,
    Button
} from '@mui/material';
import { 
    Close as CloseIcon, 
    ArrowBackIos as ArrowBackIcon, 
    ArrowForwardIos as ArrowForwardIcon 
} from '@mui/icons-material';

function ImageOverlay({ open, onClose, images = [] }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Reset to first image when overlay opens
    useEffect(() => {
        if (open) {
            setCurrentImageIndex(0);
        }
    }, [open]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyPress = (event) => {
            if (!open) return;
            
            switch (event.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                    handlePreviousImage();
                    break;
                case 'ArrowRight':
                    handleNextImage();
                    break;
                default:
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [open, currentImageIndex]);

    const handleNextImage = () => {
        setCurrentImageIndex((prev) => 
            prev === images.length - 1 ? 0 : prev + 1
        );
    };

    const handlePreviousImage = () => {
        setCurrentImageIndex((prev) => 
            prev === 0 ? images.length - 1 : prev - 1
        );
    };

    const handleBackdropClick = (event) => {
        // Close overlay if clicking on backdrop (not the image card)
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    if (images.length === 0) {
        return null;
    }

    const currentImage = images[currentImageIndex];

    return (
        <Modal
            open={open}
            onClose={onClose}
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1500
            }}
        >
            <Box
                onClick={handleBackdropClick}
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    bgcolor: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2
                }}
            >
                {/* Close button */}
                <IconButton
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        color: 'white',
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        '&:hover': {
                            bgcolor: 'rgba(0, 0, 0, 0.7)'
                        }
                    }}
                >
                    <CloseIcon />
                </IconButton>

                {/* Previous button */}
                {images.length > 1 && (
                    <IconButton
                        onClick={handlePreviousImage}
                        sx={{
                            position: 'absolute',
                            left: 16,
                            color: 'white',
                            bgcolor: 'rgba(0, 0, 0, 0.5)',
                            '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.7)'
                            }
                        }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                )}

                {/* Image card */}
                <Card
                    sx={{
                        maxWidth: '90vw',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: 'white'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <CardMedia
                        component="img"
                        image={currentImage.src}
                        alt={currentImage.alt || `Image ${currentImageIndex + 1}`}
                        sx={{
                            maxHeight: '80vh',
                            objectFit: 'contain',
                            width: 'auto'
                        }}
                    />
                    
                    {/* Image info */}
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                        {currentImage.title && (
                            <Typography variant="h6" gutterBottom>
                                {currentImage.title}
                            </Typography>
                        )}
                        
                        {currentImage.description && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                {currentImage.description}
                            </Typography>
                        )}
                        
                        {images.length > 1 && (
                            <Typography variant="caption" color="text.secondary">
                                {currentImageIndex + 1} of {images.length}
                            </Typography>
                        )}
                    </Box>
                </Card>

                {/* Next button */}
                {images.length > 1 && (
                    <IconButton
                        onClick={handleNextImage}
                        sx={{
                            position: 'absolute',
                            right: 16,
                            color: 'white',
                            bgcolor: 'rgba(0, 0, 0, 0.5)',
                            '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.7)'
                            }
                        }}
                    >
                        <ArrowForwardIcon />
                    </IconButton>
                )}
            </Box>
        </Modal>
    );
}

export default ImageOverlay;