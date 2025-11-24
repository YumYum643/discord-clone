import React, { useState, useEffect } from 'react';
import AuthForms from './components/AuthForms';
import ChatLayout from './components/ChatLayout';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    // Check if user is persisted
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, [token]);

  const handleLogin = (userData, authToken) => {
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token || !user) {
    return <AuthForms onLogin={handleLogin} />;
  }

  return <ChatLayout user={user} onLogout={handleLogout} />;
}

export default App;
