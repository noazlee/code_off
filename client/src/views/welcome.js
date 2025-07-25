import '../App.css';
import { theme } from '../constants/theme';
import { useParams, useNavigate } from 'react-router-dom';

function Welcome() {

  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>
          Code Duels!
        </h2>
        <p style={styles.welcome_text}>
          Welcome!
        </p>
        <button style={styles.sign_up_button} onClick={() => navigate("/signup/")}>
          Sign Up
        </button>
        <button style={styles.log_in_button} onClick={() => navigate("/login/")}>
          Log in
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


export default Welcome;
