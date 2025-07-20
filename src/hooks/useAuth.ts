import { useState, useEffect } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { SignUpData } from '../types/user';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Supabase is not available, set loading to false and return
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session with error handling for invalid refresh tokens
    const initializeAuth = async () => {
      try {
        // Check if there's a hash fragment in the URL (auth callback)
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
          console.log('Detected auth callback in URL hash, processing...');
          // Let Supabase handle the hash fragment
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          // If there's an error related to refresh token, clear the session
          if (error.message?.includes('Refresh Token Not Found') || 
              error.message?.includes('invalid_grant') ||
              error.message?.includes('Invalid Refresh Token')) {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          } else {
            console.error('Auth initialization error:', error);
          }
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        // Clear any potentially corrupted session
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (signUpData: SignUpData) => {
    if (!supabase) {
      return { 
        data: null, 
        error: { message: 'Database not available. Please check your configuration.' } as AuthError 
      };
    }

    // Only create the auth user - profile creation will be handled separately
    const { data, error } = await supabase.auth.signUp({
      email: signUpData.email,
      password: signUpData.password,
    });

    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { 
        data: null, 
        error: { message: 'Database not available. Please check your configuration.' } as AuthError 
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Provide more helpful error messages for common authentication issues
    if (error) {
      let friendlyMessage = error.message;
      
      if (error.message === 'Invalid login credentials') {
        friendlyMessage = 'The email or password you entered is incorrect. Please check your credentials and try again.';
      } else if (error.message.includes('Email not confirmed')) {
        friendlyMessage = 'Please check your email and click the confirmation link before signing in.';
      } else if (error.message.includes('Too many requests')) {
        friendlyMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
      } else if (error.message.includes('User not found')) {
        friendlyMessage = 'No account found with this email address. Please check your email or create a new account.';
      }

      return { 
        data, 
        error: { ...error, message: friendlyMessage } 
      };
    }

    return { data, error };
  };

  const signOut = async () => {
    if (!supabase) {
      return { error: null };
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const refreshSession = async () => {
    if (!supabase) {
      return { data: null, error: { message: 'Database not available' } as AuthError };
    }

    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      return { data, error };
    } catch (error) {
      console.error('Failed to refresh session:', error);
      return { data: null, error: error as AuthError };
    }
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    refreshSession,
  };
};