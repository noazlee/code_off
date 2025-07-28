import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { theme } from '../constants/theme';
import { io } from 'socket.io-client';
import { SOCKET_HOST, API_ENDPOINTS } from '../config/api';
import { backdropClasses } from '@mui/material';
import { border } from '@mui/system';

function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user_id } = location.state || { user_id: sessionStorage.getItem('user_id') };
  const [numPlayers, setNumPlayers] = useState(null);
  
  // Store user_id in sessionStorage when available
  useEffect(() => {
    if (user_id) {
      sessionStorage.setItem('user_id', user_id);
    }
  }, [user_id]);

  // use sockets for live player count update
  useEffect(() => {
    
    // Initialize socket connection
    console.log('Connecting to:', SOCKET_HOST);
    const newSocket = io(SOCKET_HOST);

    // Connection event listeners
    newSocket.on('player_count_update', (data) => {
        setNumPlayers(data.count);
    });
    
    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.overlay}>
        <p style={styles.overlayText}>Number of players online: {numPlayers}</p>
      </div>
      <div style={styles.overlayLeft}>
        <button style={styles.headerButton} onClick={() => navigate("/profile", { state: { user_id } })}>
          Profile
        </button>
        <button style={styles.headerButton} onClick={() => navigate("/leaderboard", { state: { user_id } })}>
          Leaderboard
        </button>
      </div>
      <header style={styles.header}>
        <h2 style={styles.title}>
          Code Duel
        </h2>
        <p style={{marginBottom: '10px'}}>Play a private match or find a random game. Join a full game to spectate!</p>
        {/* Look for a game that is random = true, if no open game, create one */}
        <button style={styles.sign_up_button} onClick={() => {
          setTimeout(async () => {
            const response = await fetch(API_ENDPOINTS.findRandomGame, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id })
            });

            const data = await response.json();
            const room_code = data.room_code;

            if (data.created_game) {
              navigate("/gameRoom", { state: { user_id, isCreator: true, roomCode: room_code} })
            } else{
              navigate('/gameRoom', { 
                state: { 
                    user_id, 
                    roomCode: room_code,
                    isCreator: false 
                } 
            });
            }

            // the api will return if the quesiton is right -> handle logic here when readOnly

        }, 1000);
        }}>
          Join Random Game 
        </button>
        <button style={styles.sign_up_button} onClick={() => navigate("/joinLobby", { state: { user_id } })}>
          Join Game
        </button>
        <button style={styles.log_in_button} onClick={() => navigate("/gameRoom", { state: { user_id, isCreator: true } })}>
          Create Game
        </button>
      </header>
    </div>
  );
}
const styles = {
    title: {
      fontSize: 'clamp(40px, 7vw, 120px)',
      fontWeight: theme.fonts.bold,
      color: theme.colors.primary,
      marginBottom: '10px',
      textAlign: "center",
      fontFamily: 'Cascadia Code, monospace',
      display: 'inline-block'
    },
    container: {
      display: 'flex',
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: theme.colors.gray,
      padding: '20px',
      boxSizing: 'border-box',
      position: 'relative'
    },
    header: {
      textAlign: 'center',
      padding: '40px',
      backgroundColor: 'rgb(0,0,0,0)',
      borderRadius: `${theme.radius.xl}px`,
      width: '80%',
      maxWidth: '400px',
      boxSizing: 'border-box'
    },
    welcome_text: {
      fontSize: 'clamp(24px, 5vw, 32px)',
      fontWeight: theme.fonts.bold,
      color: theme.colors.textDark,
      marginBottom: '30px',
      textAlign: "center"
    },
    sign_up_button: {
      backgroundColor: theme.colors.primary,
      color: 'black',
      border: 'none',
      padding: '12px 24px',
      fontSize: 'clamp(14px, 2vw, 16px)',
      borderRadius: `${theme.radius.md}px`,
      cursor: 'pointer',
      margin: '10px',
      fontWeight: theme.fonts.semibold,
      minWidth: '120px',
      width: '80%',
      maxWidth: '200px'
    },
    log_in_button: {
      backgroundColor: theme.colors.primary,
      color: 'black',
      border: 'none',
      padding: '12px 24px',
      fontSize: 'clamp(14px, 2vw, 16px)',
      borderRadius: `${theme.radius.md}px`,
      cursor: 'pointer',
      margin: '10px',
      fontWeight: theme.fonts.semibold,
      minWidth: '120px',
      width: '80%',
      maxWidth: '200px'
    },
    overlay: {
      position: 'absolute',
      top: '20px',
      right: '20px',
      backgroundColor: 'rgba(10, 200, 20, 0.2)',
      padding: '10px 20px',
      borderRadius: `${theme.radius.md}px`,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      zIndex: 10
    },
    overlayText: {
      margin: 0,
      fontSize: '14px',
      color: theme.colors.textDark,
      fontWeight: theme.fonts.medium
    },
    overlayLeft: {
      position: 'absolute',
      top: '20px',
      left: '20px'
    },
    headerButton: {
      background: 'none',
      border: 'none',
      padding: 0,
      textDecoration: 'underline',
      cursor: 'pointer',
      paddingRight: '15px',
      fontSize: '20px',
    }
  }
  
export default Home;
  