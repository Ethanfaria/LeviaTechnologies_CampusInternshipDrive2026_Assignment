import { useState } from 'react';
import { getToken } from './api';
import Login from './Login.jsx';
import Board from './Board.jsx';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken());

  function handleLogin(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('userName', user.name);
    setLoggedIn(true);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setLoggedIn(false);
  }

  return loggedIn ? <Board onLogout={handleLogout} /> : <Login onLogin={handleLogin} />;
}
