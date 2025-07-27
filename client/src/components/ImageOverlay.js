import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button } from '@mui/material';

function ImageOverlay({ open, onClose, images = [] }) {

    const BOX_WIDTH = 350;
    const BOX_HEIGHT = 320; 
    
    // Initialize position state
    const [position, setPosition] = useState({ x: 100, y: 100 });
    
    // Initialize velocity with random values
    const [velocity] = useState(() => ({
        dx: (Math.random() * 4 - 2) || 1, // -2 to 2, never 0
        dy: (Math.random() * 4 - 2) || 1  
    }));
    
    // Refs for animation
    const positionRef = useRef(position);
    const velocityRef = useRef(velocity);
    const animationRef = useRef(null);
    
    useEffect(() => {
        positionRef.current = position;
    }, [position]);
    
    useEffect(() => {
        velocityRef.current = velocity;
    }, [velocity]);

    // Animation
    useEffect(() => {
        if (!open) return;

        const animate = () => {
            const currentPos = positionRef.current;
            const currentVel = velocityRef.current;
            
            let newX = currentPos.x + currentVel.dx;
            let newY = currentPos.y + currentVel.dy;
            let newDx = currentVel.dx;
            let newDy = currentVel.dy;
            
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            if (newX <= 0 || newX + BOX_WIDTH >= windowWidth) {
                newDx = -currentVel.dx;
                newX = newX <= 0 ? 0 : windowWidth - BOX_WIDTH;
            }
            
            // Check vertical boundaries
            if (newY <= 0 || newY + BOX_HEIGHT >= windowHeight) {
                newDy = -currentVel.dy;
                newY = newY <= 0 ? 0 : windowHeight - BOX_HEIGHT;
            }
            
            // Update velocity if changed
            if (newDx !== currentVel.dx || newDy !== currentVel.dy) {
                velocityRef.current = { dx: newDx, dy: newDy };
            }
            
            setPosition({ x: newX, y: newY });
            animationRef.current = requestAnimationFrame(animate);
        };
        
        animationRef.current = requestAnimationFrame(animate);
        
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        
        const handleResize = () => {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            setPosition(prev => ({
                x: Math.min(prev.x, windowWidth - BOX_WIDTH),
                y: Math.min(prev.y, windowHeight - BOX_HEIGHT)
            }));
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [open]);

    if (!open || images.length === 0) {
        return null;
    }

    // Just show the first image for simplicity
    const currentImage = images[0];

    return (
        <Box
            sx={{
                position: 'fixed',
                top: position.y,
                left: position.x,
                width: BOX_WIDTH,
                maxWidth: '30vw',
                bgcolor: 'white',
                borderRadius: 2,
                boxShadow: 3,
                zIndex: 1200,
                overflow: 'hidden',
                transition: 'none' // Disable CSS transitions for smooth animation
            }}
        >
            {/* Close button */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1201
                }}
            >
                <Button
                    onClick={onClose}
                    variant="contained"
                    size="small"
                    sx={{
                        minWidth: 'auto',
                        width: 24,
                        height: 24,
                        p: 0,
                        fontSize: '12px'
                    }}
                >
                    ×
                </Button>
            </Box>

            {/* Image */}
            <Box
                component="img"
                src={currentImage.src}
                alt={currentImage.alt || 'Overlay image'}
                sx={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: 200,
                    objectFit: 'cover',
                    display: 'block'
                }}
            />

            {/* Image info */}
            <Box sx={{ p: 1 }}>
                {currentImage.title && (
                    <Typography variant="subtitle2" gutterBottom>
                        {currentImage.title}
                    </Typography>
                )}
                
                {currentImage.description && (
                    <Typography variant="caption" color="text.secondary">
                        {currentImage.description}
                    </Typography>
                )}
            </Box>
        </Box>
    );
}

export default ImageOverlay;