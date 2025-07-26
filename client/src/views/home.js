import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { theme } from '../constants/theme';
import { API_ENDPOINTS } from '../config/api';

function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user_id } = location.state || {};

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>
          {user_id}
        </h2>
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
            alert(data.created_game);

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
      fontSize: 'clamp(24px, 5vw, 50px)',
      fontWeight: theme.fonts.bold,
      color: theme.colors.text,
      marginBottom: '10px',
      textAlign: "center"
    },
    container: {
      display: 'flex',
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: theme.colors.gray,
      padding: '20px',
      boxSizing: 'border-box'
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
      color: 'white',
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
      backgroundColor: theme.colors.primaryDark,
      color: 'white',
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
    }
  }
  
export default Home;
  