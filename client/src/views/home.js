import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { theme } from '../constants/theme';

function Home() {
  const [code, setCode] = useState('// Your code here');
  const navigate = useNavigate();
  const location = useLocation();
  const { user_id } = location.state || {};

  function handleEditorChange(value, event) {
    setCode(value);
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>
          {user_id}
        </h2>
        <button style={styles.sign_up_button} onClick={() => navigate("/joinLobby/")}>
          Join Game
        </button>
        <button style={styles.log_in_button} onClick={() => navigate("/game/")}>
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
  