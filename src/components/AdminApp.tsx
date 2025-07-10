import React, { useState, useEffect } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminPanel } from './AdminPanel';

// Admin credentials
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

export const AdminApp: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing admin session
  useEffect(() => {
    const adminSession = localStorage.getItem('fignum_admin_session');
    if (adminSession) {
      try {
        const sessionData = JSON.parse(adminSession);
        const expiresAt = new Date(sessionData.expires_at);
        
        if (expiresAt > new Date()) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('fignum_admin_session');
        }
      } catch (error) {
        localStorage.removeItem('fignum_admin_session');
      }
    }
  }, []);

  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      // Create admin session
      const sessionData = {
        admin: {
          username: ADMIN_CREDENTIALS.username,
          login_time: new Date().toISOString()
        },
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
        session_token: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      localStorage.setItem('fignum_admin_session', JSON.stringify(sessionData));
      setIsAuthenticated(true);
      setLoading(false);
      return true;
    } else {
      setError('Invalid admin credentials');
      setLoading(false);
      return false;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('fignum_admin_session');
    setIsAuthenticated(false);
    setError(null);
  };

  if (isAuthenticated) {
    return <AdminPanel onLogout={handleLogout} />;
  }

  return (
    <AdminLogin
      onLogin={handleLogin}
      loading={loading}
      error={error}
    />
  );
};