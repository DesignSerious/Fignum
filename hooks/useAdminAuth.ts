import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AdminSession {
  admin: {
    id: string;
    username: string;
    role: string;
    login_time: string;
  };
  expires_at: string;
  session_token: string;
}

export const useAdminAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      const sessionData = localStorage.getItem('fignum_admin_session');
      if (sessionData) {
        try {
          const session: AdminSession = JSON.parse(sessionData);
          const expiresAt = new Date(session.expires_at);
          
          if (expiresAt > new Date()) {
            setIsAuthenticated(true);
            setAdminUser(session.admin);
          } else {
            localStorage.removeItem('fignum_admin_session');
          }
        } catch (error) {
          localStorage.removeItem('fignum_admin_session');
        }
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  const login = async (username: string, password: string, userRole: string = 'admin') => {
    setLoading(true);
    
    try {
      // Verify credentials (in production, this would be against a secure backend)
      if (username === 'admin' && password === 'fignum2024!') {
        const sessionData: AdminSession = {
          admin: {
            id: `admin_${Date.now()}`,
            username,
            role: userRole,
            login_time: new Date().toISOString()
          },
          expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
          session_token: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        localStorage.setItem('fignum_admin_session', JSON.stringify(sessionData));
        
        // Log the admin login
        if (supabase) {
          try {
            await supabase.rpc('log_admin_action', {
              admin_id: sessionData.admin.id,
              action_type: 'admin_login',
              target_user_id: null,
              action_details: {
                username,
                ip_address: await getClientIP(),
                user_agent: navigator.userAgent
              }
            });
          } catch (logError) {
            console.warn('Failed to log admin login:', logError);
          }
        }

        setIsAuthenticated(true);
        setAdminUser(sessionData.admin);
        return { success: true };
      } else {
        return { success: false, error: 'Invalid credentials' };
      }
    } catch (error) {
      return { success: false, error: 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // Log the admin logout
    if (supabase && adminUser) {
      try {
        await supabase.rpc('log_admin_action', {
          admin_id: adminUser.id,
          action_type: 'admin_logout',
          target_user_id: null,
          action_details: {
            username: adminUser.username,
            logout_time: new Date().toISOString()
          }
        });
      } catch (logError) {
        console.warn('Failed to log admin logout:', logError);
      }
    }

    localStorage.removeItem('fignum_admin_session');
    setIsAuthenticated(false);
    setAdminUser(null);
  };

  const refreshSession = () => {
    const sessionData = localStorage.getItem('fignum_admin_session');
    if (sessionData) {
      try {
        const session: AdminSession = JSON.parse(sessionData);
        // Extend session by 8 hours
        session.expires_at = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
        localStorage.setItem('fignum_admin_session', JSON.stringify(session));
      } catch (error) {
        console.error('Failed to refresh session:', error);
      }
    }
  };

  return {
    isAuthenticated,
    adminUser,
    loading,
    login,
    logout,
    refreshSession
  };
};

// Helper function to get client IP (simplified)
const getClientIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    return 'unknown';
  }
};