import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import '../App.css';
import { theme } from '../constants/theme';

const LeaderBoard = () => {
    const { userId } = useParams();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { user_id } = location.state || {};

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch(`${API_ENDPOINTS.getLeaderboard}`);
                const data = await response.json();
                console.log(data);
                setUsers(data);
            } catch (err) {
                console.error('Failed to fetch users', err);
                setError('Failed to load leaderboard.');
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
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
            <h1 style={styles.title}>All Time Leaderboard</h1>
            {error && <p style={styles.error}>{error}</p>}
            {loading ? (
                <p style={styles.loading}>Loading...</p>
            ) : (
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Rank</th>
                            <th style={styles.th}>Username</th>
                            <th style={styles.th}>Games Won</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user, index) => {
                            const isCurrentUser = user.id === userId;
                            return (
                                <tr
                                    key={user.id || index}
                                    style={{
                                        ...styles.trHover,
                                        ...(isCurrentUser ? styles.trActive : {})
                                    }}
                                >
                                    <td style={styles.td}>{index + 1}</td>
                                    <td style={styles.td}>{user.username}</td>
                                    <td style={styles.td}>{user.num_wins}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default LeaderBoard;