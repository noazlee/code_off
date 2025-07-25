import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { theme } from '../constants/theme';

function LogIn() {
    const navigate = useNavigate();
    const userRef = useRef(null);
    const passwordRef = useRef(null);
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        
        const username = userRef.current?.value?.trim();
        const password = passwordRef.current?.value?.trim();
        
        if (!username || !password) {
            alert("Log In - Please fill all the fields.");
            return;
        }

        setLoading(true);
        
        // TODO: Add authentication logic here
        setTimeout(async () => {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: {
                  "content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({username, password})
               })

               const data = await response.json()
                if(data.message === "User logged in successfully"){
                    // make socket - authenticated
                    navigate("/home");
                }else{
                    alert("Error in Log in!");
                }

        }, 1000);



    };

    return (
        <div style={styles.container}>
            <div style={styles.content}>
                <button style={styles.backButton} onClick={() => navigate(-1)}>
                    ← Back
                </button>
                
                <div>
                    <h1 style={styles.welcomeText}>Welcome</h1>
                    <h1 style={styles.welcomeText}>Back</h1>
                </div>

                <form style={styles.form} onSubmit={onSubmit}>
                    <p style={styles.subtitle}>Please Log In to continue</p>
                    
                    <input
                        ref={userRef}
                        type="email"
                        placeholder="Enter your username"
                        style={styles.input}
                    />
                    
                    <input
                        ref={passwordRef}
                        type="password"
                        placeholder="Enter your password"
                        style={styles.input}
                    />

                    <button 
                        type="submit" 
                        style={{...styles.submitButton, opacity: loading ? 0.7 : 1}}
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Log In'}
                    </button>

                    <div style={styles.footer}>
                        <span style={styles.footerText}>
                            Don't have an account?
                        </span>
                        <button
                            type="button"
                            style={styles.linkButton}
                            onClick={() => navigate('/signup')}
                        >
                            Sign Up
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const styles = {
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
    content: {
        backgroundColor: 'rgb(0,0,0,0)',
        borderRadius: `${theme.radius.xl}px`,
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
    },
    backButton: {
        background: 'none',
        border: 'none',
        fontSize: '16px',
        cursor: 'pointer',
        marginBottom: '30px',
        color: theme.colors.text
    },
    welcomeText: {
        fontSize: '32px',
        fontWeight: theme.fonts.bold,
        color: theme.colors.text,
        margin: '0',
        lineHeight: '1.2'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        marginTop: '40px'
    },
    subtitle: {
        fontSize: '14px',
        color: theme.colors.text,
        margin: '0'
    },
    input: {
        padding: '12px 16px',
        borderRadius: `${theme.radius.md}px`,
        border: `1px solid ${theme.colors.gray}`,
        fontSize: '16px',
        outline: 'none'
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
        color: 'white',
        border: 'none',
        padding: '14px',
        borderRadius: `${theme.radius.md}px`,
        fontSize: '16px',
        fontWeight: theme.fonts.semibold,
        cursor: 'pointer'
    },
    footer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        marginTop: '10px'
    },
    footerText: {
        color: theme.colors.text,
        fontSize: '14px'
    },
    linkButton: {
        background: 'none',
        border: 'none',
        color: theme.colors.primaryDark,
        fontWeight: theme.fonts.semibold,
        fontSize: '14px',
        cursor: 'pointer',
        textDecoration: 'underline'
    }
};

export default LogIn;
