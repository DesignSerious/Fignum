import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export const DatabaseStatus: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error' | 'not-configured'>('checking');
  const [details, setDetails] = useState<string>('');
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    setStatus('checking');
    setDetails('Testing database connection...');

    if (!supabase) {
      setStatus('not-configured');
      setDetails('Supabase client not configured. Check your .env file.');
      setTesting(false);
      return;
    }

    try {
      // Test basic connection
      const { data, error } = await supabase
        .from('user_profiles')
        .select('count', { count: 'exact', head: true });

      if (error) {
        setStatus('error');
        setDetails(`Database error: ${error.message}`);
      } else {
        setStatus('connected');
        setDetails(`Connected successfully. Found ${data || 0} user profiles.`);
      }
    } catch (err) {
      setStatus('error');
      setDetails(`Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'error':
        return <XCircle className="text-red-600" size={20} />;
      case 'not-configured':
        return <AlertCircle className="text-yellow-600" size={20} />;
      default:
        return <RefreshCw className="text-blue-600 animate-spin" size={20} />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'not-configured':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className={`p-4 border rounded-lg ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium">Database Status</span>
        </div>
        <button
          onClick={testConnection}
          disabled={testing}
          className="px-3 py-1 bg-white bg-opacity-50 rounded text-sm hover:bg-opacity-75 transition-colors"
        >
          {testing ? 'Testing...' : 'Test'}
        </button>
      </div>
      <p className="text-sm mt-2">{details}</p>
      
      {status === 'not-configured' && (
        <div className="mt-3 p-3 bg-white bg-opacity-50 rounded text-xs">
          <p className="font-medium mb-2">To fix this:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Create a .env file in your project root</li>
            <li>Add your Supabase URL and keys</li>
            <li>Restart the development server</li>
          </ol>
        </div>
      )}
      
      {status === 'error' && (
        <div className="mt-3 p-3 bg-white bg-opacity-50 rounded text-xs">
          <p className="font-medium mb-2">Common solutions:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Check if your Supabase project is paused</li>
            <li>Verify your environment variables are correct</li>
            <li>Make sure the database migration was applied</li>
            <li>Check the SETUP_INSTRUCTIONS.md file</li>
          </ul>
        </div>
      )}
    </div>
  );
};