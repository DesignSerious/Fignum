import { useState, useEffect } from 'react';
import { createUser, getUserByEmail, getUserById } from '../lib/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'your-jwt-secret-key-change-this-in-production';
const TOKEN_KEY = 'fignum_auth_token';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  trial_start_date: string;
  trial_end_date: string;
  subscription_status: 'trial' | 'active' | 'expired' | 'cancelled';
  subscription_end_date?: string;
  created_at: string;
  updated_at: string;
}

interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export const usePlanetScaleAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
          const userData = await getUserById(decoded.userId);
          if (userData) {
            setUser(userData);
          } else {
            localStorage.removeItem(TOKEN_KEY);
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem(TOKEN_KEY);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const signUp = async (signUpData: SignUpData) => {
    try {
      setLoading(true);
      
      // Check if user already exists
      const existingUser = await getUserByEmail(signUpData.email);
      if (existingUser) {
        return {
          data: null,
          error: { message: 'User already registered' }
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(signUpData.password, 10);

      // Create user
      const newUser = await createUser({
        email: signUpData.email,
        password_hash: passwordHash,
        first_name: signUpData.firstName,
        last_name: signUpData.lastName,
        phone_number: signUpData.phoneNumber,
      });

      // Create JWT token
      const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });
      localStorage.setItem(TOKEN_KEY, token);

      setUser(newUser);
      return {
        data: { user: newUser },
        error: null
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Sign up failed' }
      };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Find user
      const userData = await getUserByEmail(email);
      if (!userData) {
        return {
          data: null,
          error: { message: 'The email or password you entered is incorrect. Please check your credentials and try again.' }
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, userData.password_hash);
      if (!isValidPassword) {
        return {
          data: null,
          error: { message: 'The email or password you entered is incorrect. Please check your credentials and try again.' }
        };
      }

      // Create JWT token
      const token = jwt.sign({ userId: userData.id }, JWT_SECRET, { expiresIn: '7d' });
      localStorage.setItem(TOKEN_KEY, token);

      setUser(userData);
      return {
        data: { user: userData },
        error: null
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Sign in failed' }
      };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    return { error: null };
  };

  // Calculate trial info
  const trialInfo = user ? {
    subscription_status: user.subscription_status,
    trial_start_date: user.trial_start_date,
    trial_end_date: user.trial_end_date,
    days_remaining: Math.max(0, Math.ceil((new Date(user.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
    has_access: user.subscription_status === 'active' || 
                (user.subscription_status === 'trial' && new Date(user.trial_end_date) > new Date()),
    subscription_end_date: user.subscription_end_date
  } : null;

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    trialInfo
  };
};