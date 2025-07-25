import { useNavigate } from 'react-router-dom';
import '../App.css';
import { theme } from '../constants/theme';

function SignUp() {

    const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>
          Sign up
        </h2>
        <button style={styles.press_button} onClick={() => navigate(-1)}>
          Back
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
    press_button: {
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
  }
  
  
export default SignUp;
  