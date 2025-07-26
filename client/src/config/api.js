// API configuration for dynamic host detection
const getApiHost = () => {
    // Use localhost for local development, otherwise use the actual hostname
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5001';
    }
    
    // For other devices on the network, use the host's IP
    return `http://${hostname}:5001`;
};

export const API_HOST = getApiHost();
export const SOCKET_HOST = API_HOST;

export const API_ENDPOINTS = {
    signup: `${API_HOST}/api/signup`,
    login: `${API_HOST}/api/login`,
    createRoom: `${API_HOST}/api/create-room`
};