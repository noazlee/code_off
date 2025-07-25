import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './views/login';
import SignUp from './views/signup';
import Welcome from './views/welcome';
import Test from './views/test';
import Editor from './views/editor';

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Welcome/>} />
                <Route path="/login" element={<Login/>} />
                <Route path="/signup" element={<SignUp/>} />
                <Route path="/editor" element={<Editor/>} />

                <Route path="/test" element={<Test/>} />
            </Routes>
        </Router>
    );
};

export default App;