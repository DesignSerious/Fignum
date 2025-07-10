import React, { useState, useEffect } from 'react';
import { AdminLogin } from './AdminLogin';
import { SecureAdminDashboard } from './SecureAdminDashboard';
import { supabase } from '../lib/supabase';

// Enhanced admin credentials with role-based access
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'fignum2024!',
  role: 'super_admin'
};

export const AdminApp: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Check for existing admin session
  useEffect(() => {
    const checkAdminSession = async () => {
      const adminSession = localStorage.getItem('fignum_admin_session');
      if (adminSession) {
        try {
          const sessionData = JSON.parse(adminSession);
          const expiresAt = new Date(sessionData.expires_at);
          
          if (expiresAt > new Date()) {
            setIsAuthenticated(true);
            setAdminUser(sessionData.admin);
          } else {
            localStorage.removeItem('fignum_admin_session');
          }
        } catch (error) {
          localStorage.removeItem('fignum_admin_session');
        }
      }
    };

    checkAdminSession();
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
          role: ADMIN_CREDENTIALS.role,
          login_time: new Date().toISOString()
        },
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
        session_token: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      localStorage.setItem('fignum_admin_session', JSON.stringify(sessionData));
      
      // Log admin login if Supabase is available
      if (supabase) {
        try {
          await supabase.rpc('log_admin_action', {
            admin_id: null, // System admin
            action_type: 'admin_login',
            target_user_id: null,
            action_details: {
              username: username,
              timestamp: new Date().toISOString(),
              user_agent: navigator.userAgent
            }
          });
        } catch (logError) {
          console.warn('Failed to log admin login:', logError);
        }
      }

      setAdminUser(sessionData.admin);
      setIsAuthenticated(true);
      setLoading(false);
      return true;
    } else {
      setError('Invalid admin credentials');
      setLoading(false);
      return false;
    }
  };

  const handleLogout = async () => {
    // Log admin logout if Supabase is available
    if (supabase && adminUser) {
      try {
        await supabase.rpc('log_admin_action', {
          admin_id: null, // System admin
          action_type: 'admin_logout',
          target_user_id: null,
          action_details: {
            username: adminUser.username,
            timestamp: new Date().toISOString()
          }
        });
      } catch (logError) {
        console.warn('Failed to log admin logout:', logError);
      }
    }

    localStorage.removeItem('fignum_admin_session');
    setIsAuthenticated(false);
    setAdminUser(null);
    setError(null);
  };

  if (isAuthenticated) {
    return <SecureAdminDashboard onLogout={handleLogout} />;
  }

  return (
    <AdminLogin
      onLogin={handleLogin}
      loading={loading}
      error={error}
    />
  );
};