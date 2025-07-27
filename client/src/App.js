import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './views/login';
import SignUp from './views/signup';
import Welcome from './views/welcome';
import Test from './views/test';
import Editor from './views/editor';
import Home from './views/home';
import GameRoom from './views/gameRoom';
import JoinLobby from './views/joinLobby';
import GameResults from './views/gameResults';
import LeaderBoard from './views/leaderboard';
import Profile from './views/profile';

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Welcome/>} />
                <Route path="/login" element={<Login/>} />
                <Route path="/signup" element={<SignUp/>} />
                <Route path="/home" element={<Home/>} />
                <Route path="/editor" element={<Editor/>} />
                <Route path="/gameRoom" element={<GameRoom/>} />
                <Route path="/joinLobby" element={<JoinLobby/>} />
                <Route path="/gameResults" element={<GameResults/>} />
                <Route path="/leaderboard" element={<LeaderBoard/>} />
                <Route path="/profile" element={<Profile/>} />

                <Route path="/test" element={<Test/>} />
            </Routes>
        </Router>
    );
};

export default App;