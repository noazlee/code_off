import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import { useLocation } from 'react-router-dom';
import '../App.css';
import { theme } from '../constants/theme';

const Profile = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user_id } = location.state || {};
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            console.log('Fetching game history for user:', user_id);
            try {
                const url = `${API_ENDPOINTS.getGameHistory}?user_id=${encodeURIComponent(user_id)}`;
                console.log('Fetching from URL:', url);
                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await response.json();
                console.log('Game history data:', data);
                setHistory(data);
                console.info(history);
            } catch (err) {
                console.error('Failed to fetch game history', err);
                setError('Failed to load game history.');
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);



    const styles = {
        container: {
            height: '100vh',
            width: '100vw',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: '40px',
            backgroundColor: theme.colors.gray,
        },
        title: {
            fontSize: '2.5rem',
            marginBottom: '20px',
            color: '#FFF',
        },
        button: {
            padding: '10px 20px',
            backgroundColor: theme.colors.primary,
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            marginBottom: '30px',
        },
        table: {
            borderCollapse: 'collapse',
            width: '90%',
            maxWidth: '800px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            backgroundColor: '#fff',
            borderRadius: '12px',
            overflow: 'hidden',
        },
        th: {
            backgroundColor: theme.colors.primary,
            color: '#000',
            padding: '15px',
            textAlign: 'left',
            fontWeight: '600',
        },
        td: {
            padding: '15px',
            borderBottom: '1px solid #dee2e6',
            color: '#212529',
        },
        trHover: {
            transition: 'background 0.2s ease-in-out',
        },
        trActive: {
            backgroundColor: '#e9f5ff',
        },
        loading: {
            fontSize: '18px',
            color: '#555',
        },
        error: {
            color: 'red',
            marginBottom: '10px',
        }
    };

    return (
        <div style={styles.container}>
            <button style={styles.button} onClick={() => navigate(`/home`, { state: { user_id } })}>Go Home</button>
            <h1 style={styles.title}>Game History</h1>
            {error && <p style={styles.error}>{error}</p>}
            {loading ? (
                <p style={styles.loading}>Loading...</p>
            ) : (
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Opponent</th>
                            <th style={styles.th}>Winner</th>
                            <th style={styles.th}>Your Answered Questions</th>
                            <th style={styles.th}>Opponent Answered Questions</th>
                            <th style={styles.th}>Game Duration</th>
                            <th style={styles.th}>Played On</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((history, index) => {
                            return (
                                <tr
                                    key={index}
                                    style={{
                                        ...styles.trHover
                                    }}
                                >
                                    <td style={styles.td}>{history.opponent}</td>
                                    <td style={styles.td}>{history.winner}</td>
                                    <td style={styles.td}>{history.your_questions_answered}</td>
                                    <td style={styles.td}>{history.opponent_questions_answered}</td>
                                    <td style={styles.td}>{history.duration_seconds}</td>
                                    <td style={styles.td}>{new Date(history.played_on).toLocaleDateString()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default Profile;