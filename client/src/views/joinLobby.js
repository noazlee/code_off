import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function JoinLobby() {
    const [lobbyCode, setLobbyCode] = useState('');
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (lobbyCode.trim()) {
            // TODO: Add API call to join lobby with code
            console.log('Joining lobby with code:', lobbyCode);
        }
    };

    const handleBack = () => {
        navigate('/welcome');
    };

    return (
       <div>
        
       </div>
    );
}

export default JoinLobby;