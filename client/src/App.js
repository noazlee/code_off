import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './views/login';
import SignUp from './views/signup';
import Welcome from './views/welcome';

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Welcome/>} />
                <Route path="/login" element={<Login/>} />
                <Route path="/signup" element={<SignUp/>} />
                {/* put all routes here */}
            </Routes>
        </Router>
    );
};

export default App;