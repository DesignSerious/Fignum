import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Edit3, 
  Save, 
  X, 
  Calendar, 
  CreditCard, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  LogOut,
  Shield,
  Filter,
  Download,
  AlertCircle as AlertIcon,
  RefreshCw,
  Wifi,
  WifiOff,
  UserPlus,
  Database
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminUser {
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
  project_count: number;
  days_remaining: number;
  has_access: boolean;
}

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminUser>>({});
  const [saving, setSaving] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);

  // Add component mount logging
  useEffect(() => {
    console.log('🚀 AdminDashboard component mounted');
    console.log('🔧 Supabase client available:', !!supabase);
    console.log('🌍 Environment variables:', {
      url: import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET',
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
      serviceKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'
    });
    
    if (supabase) {
      setDebugInfo('Component mounted, Supabase client available');
      setConnectionStatus('unknown');
    } else {
      setDebugInfo('Component mounted, Supabase client NOT available');
      setConnectionStatus('failed');
      setError('Supabase client not initialized');
    }
  }, []);

  // Get diagnostic information
  const getDiagnosticInfo = async () => {
    if (!supabase) return;

    try {
      console.log('🔍 Getting diagnostic information...');
      
      // Try to get user diagnostic info
      const { data: diagnostic, error: diagnosticError } = await supabase
        .rpc('admin_get_user_diagnostic');

      if (diagnosticError) {
        console.error('❌ Diagnostic error:', diagnosticError);
        setDebugInfo(prev => prev + ` | Diagnostic error: ${diagnosticError.message}`);
        return;
      }

      console.log('📊 Diagnostic info:', diagnostic);
      setDiagnosticInfo(diagnostic);
      setDebugInfo(prev => prev + ` | Diagnostic: ${diagnostic.total_auth_users} auth users, ${diagnostic.total_profiles} profiles`);

    } catch (err) {
      console.error('💥 Diagnostic error:', err);
      setDebugInfo(prev => prev + ` | Diagnostic failed: ${err}`);
    }
  };

  // Create missing profiles for existing auth users
  const createMissingProfiles = async () => {
    if (!supabase) return;

    try {
      console.log('🔧 Creating missing profiles...');
      setDebugInfo('Creating missing profiles for existing auth users...');

      const { data: result, error } = await supabase
        .rpc('admin_create_missing_profiles');

      if (error) {
        console.error('❌ Create profiles error:', error);
        setError(`Failed to create profiles: ${error.message}`);
        return;
      }

      console.log('✅ Create profiles result:', result);
      setDebugInfo(`Success! ${result.message}`);
      
      // Refresh the user list
      await fetchUsers();
      
    } catch (err) {
      console.error('💥 Create profiles error:', err);
      setError(`Failed to create profiles: ${err}`);
    }
  };

  // Test Supabase connection with better error handling
  const testConnection = async () => {
    console.log('🧪 Testing Supabase connection...');
    setDebugInfo('Testing Supabase connection...');
    setError(null);
    
    if (!supabase) {
      const errorMsg = 'Supabase client not initialized. Check environment variables.';
      console.error('❌', errorMsg);
      setDebugInfo(errorMsg);
      setError(errorMsg);
      setConnectionStatus('failed');
      return false;
    }

    try {
      // Test 1: Basic connection with simple query
      console.log('🔗 Testing basic connection...');
      const { data, error } = await supabase
        .from('user_profiles')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error('❌ Connection test failed:', error);
        setDebugInfo(`Connection failed: ${error.message}`);
        setError(`Database connection failed: ${error.message}`);
        setConnectionStatus('failed');
        return false;
      }

      console.log('✅ Basic connection successful, count:', data);
      setDebugInfo(`Connection successful! Found ${data || 0} user profiles.`);
      setConnectionStatus('connected');
      
      // Get diagnostic info after successful connection
      await getDiagnosticInfo();
      
      return true;

    } catch (err) {
      console.error('💥 Connection test error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown connection error';
      setDebugInfo(`Connection error: ${errorMessage}`);
      setError(`Connection failed: ${errorMessage}`);
      setConnectionStatus('failed');
      return false;
    }
  };

  const fetchUsers = async () => {
    console.log('🔍 Starting fetchUsers...');
    setDebugInfo('Starting user fetch...');
    setError(null);
    
    if (!supabase) {
      const errorMsg = 'Supabase not configured. Please check your environment variables.';
      console.error('❌', errorMsg);
      setDebugInfo(errorMsg);
      setError(errorMsg);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setDebugInfo('Supabase client available, testing connection...');
      
      // Test basic connection first
      const connectionOk = await testConnection();
      if (!connectionOk) {
        setLoading(false);
        return;
      }
      
      // Method 1: Try to fetch user profiles directly (most reliable)
      console.log('📊 Fetching user profiles directly...');
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*');

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        setDebugInfo(`Profile fetch error: ${profilesError.message}`);
        setError(`Failed to fetch user profiles: ${profilesError.message}`);
        setLoading(false);
        return;
      }

      console.log('📋 Fetched profiles:', profiles);
      setDebugInfo(`Fetched ${profiles?.length || 0} profiles successfully.`);

      if (!profiles || profiles.length === 0) {
        console.log('⚠️ No profiles found in database');
        setDebugInfo('No user profiles found in database. Users may not have completed signup.');
        setUsers([]);
        setLoading(false);
        return;
      }

      // Fetch project counts for each user
      console.log('📊 Fetching project counts...');
      const { data: projectCounts, error: projectError } = await supabase
        .from('projects')
        .select('user_id');

      if (projectError) {
        console.error('⚠️ Error fetching projects (non-fatal):', projectError);
        setDebugInfo(prev => prev + ` | Project fetch warning: ${projectError.message}`);
      }

      // Count projects per user
      const projectCountMap = (projectCounts || []).reduce((acc, project) => {
        acc[project.user_id] = (acc[project.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Try to get auth users for email addresses
      let authUsers: any[] = [];
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError && authData) {
          authUsers = authData.users;
          console.log('✅ Successfully fetched auth users:', authUsers.length);
          setDebugInfo(prev => prev + ` | Fetched ${authUsers.length} auth users.`);
        } else {
          console.log('⚠️ Could not fetch auth users:', authError?.message);
          setDebugInfo(prev => prev + ` | Auth users warning: ${authError?.message || 'Unknown error'}`);
        }
      } catch (authErr) {
        console.log('⚠️ Auth users fetch failed:', authErr);
        setDebugInfo(prev => prev + ` | Auth users error: ${authErr}`);
      }

      // Combine the data
      const combinedUsers: AdminUser[] = (profiles || []).map((profile, index) => {
        const authUser = authUsers.find(u => u.id === profile.id);
        const projectCount = projectCountMap[profile.id] || 0;
        
        // Calculate days remaining
        const trialEndDate = new Date(profile.trial_end_date);
        const now = new Date();
        const daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        
        // Check if user has access
        const hasAccess = profile.subscription_status === 'active' || 
                         (profile.subscription_status === 'trial' && daysRemaining > 0);

        return {
          ...profile,
          email: authUser?.email || `user${index + 1}@example.com`, // Fallback to mock email
          project_count: projectCount,
          days_remaining: daysRemaining,
          has_access: hasAccess
        };
      });

      console.log('👥 Combined users result:', combinedUsers);
      setDebugInfo(`Successfully processed ${combinedUsers.length} users.`);
      setUsers(combinedUsers);
    } catch (error) {
      console.error('💥 Error in fetchUsers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setDebugInfo(`FETCH ERROR: ${errorMessage}`);
      setError(`Failed to fetch users: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 useEffect triggered for fetchUsers');
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone_number.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || user.subscription_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleEdit = (user: AdminUser) => {
    setEditingUser(user.id);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      subscription_status: user.subscription_status,
      subscription_end_date: user.subscription_end_date
    });
  };

  const handleSave = async () => {
    if (!editingUser || !supabase) return;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          ...editForm,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser);

      if (error) throw error;

      await fetchUsers(); // Refresh data
      setEditingUser(null);
      setEditForm({});
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
    setEditForm({});
  };

  const getStatusIcon = (status: string, hasAccess: boolean) => {
    if (status === 'active') return <CheckCircle size={16} className="text-green-600" />;
    if (status === 'trial' && hasAccess) return <Clock size={16} className="text-blue-600" />;
    if (status === 'trial' && !hasAccess) return <AlertTriangle size={16} className="text-orange-600" />;
    if (status === 'expired') return <XCircle size={16} className="text-red-600" />;
    if (status === 'cancelled') return <X size={16} className="text-gray-600" />;
    return null;
  };

  const getStatusColor = (status: string, hasAccess: boolean) => {
    if (status === 'active') return 'bg-green-100 text-green-800';
    if (status === 'trial' && hasAccess) return 'bg-blue-100 text-blue-800';
    if (status === 'trial' && !hasAccess) return 'bg-orange-100 text-orange-800';
    if (status === 'expired') return 'bg-red-100 text-red-800';
    if (status === 'cancelled') return 'bg-gray-100 text-gray-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const exportUsers = () => {
    const csvContent = [
      ['Email', 'First Name', 'Last Name', 'Phone', 'Status', 'Trial End', 'Projects', 'Days Remaining', 'Has Access'].join(','),
      ...filteredUsers.map(user => [
        user.email,
        user.first_name,
        user.last_name,
        user.phone_number,
        user.subscription_status,
        formatDate(user.trial_end_date),
        user.project_count,
        user.days_remaining,
        user.has_access ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fignum-users-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
          {debugInfo && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md">
              <p className="text-sm text-blue-800 font-mono">{debugInfo}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <Shield size={24} className="text-red-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Fignum Admin</h1>
                <p className="text-sm text-red-600 font-medium">User Management Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {connectionStatus === 'connected' && (
                  <div className="flex items-center gap-1 text-green-600">
                    <Wifi size={16} />
                    <span className="text-sm">Connected</span>
                  </div>
                )}
                {connectionStatus === 'failed' && (
                  <div className="flex items-center gap-1 text-red-600">
                    <WifiOff size={16} />
                    <span className="text-sm">Disconnected</span>
                  </div>
                )}
                {connectionStatus === 'unknown' && (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <AlertIcon size={16} />
                    <span className="text-sm">Unknown</span>
                  </div>
                )}
                <button
                  onClick={testConnection}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Test
                </button>
              </div>
              
              <span className="text-sm text-gray-600">
                {filteredUsers.length} of {users.length} users
              </span>
              <button
                onClick={onLogout}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Configuration Check */}
        {!supabase && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertIcon size={20} />
              <h3 className="font-medium">Configuration Required</h3>
            </div>
            <p className="text-sm text-yellow-700 mt-2">
              Supabase is not configured. Please add your Supabase URL and keys to the .env file:
            </p>
            <div className="mt-2 p-2 bg-yellow-100 rounded text-xs font-mono text-yellow-800">
              VITE_SUPABASE_URL=your_supabase_url<br/>
              VITE_SUPABASE_ANON_KEY=your_anon_key<br/>
              VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-red-800 mb-2">Error:</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={fetchUsers}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Debug Info Panel */}
        {debugInfo && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-2">Debug Information:</h3>
                <p className="text-sm text-blue-700 font-mono">{debugInfo}</p>
                
                {/* Diagnostic Info */}
                {diagnosticInfo && (
                  <div className="mt-3 p-3 bg-blue-100 rounded">
                    <h4 className="text-xs font-medium text-blue-800 mb-2">Database Diagnostic:</h4>
                    <div className="text-xs text-blue-700 space-y-1">
                      <div>Auth Users: {diagnosticInfo.total_auth_users}</div>
                      <div>User Profiles: {diagnosticInfo.total_profiles}</div>
                      <div>Missing Profiles: {diagnosticInfo.users_without_profiles}</div>
                      <div>Completion Rate: {diagnosticInfo.profile_completion_rate}%</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={fetchUsers}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
                
                {/* Create Missing Profiles Button */}
                {diagnosticInfo && diagnosticInfo.users_without_profiles > 0 && (
                  <button
                    onClick={createMissingProfiles}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center gap-2"
                  >
                    <UserPlus size={14} />
                    Create {diagnosticInfo.users_without_profiles} Profiles
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users size={24} className="text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Subscribers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.subscription_status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Clock size={24} className="text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Trial Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.subscription_status === 'trial').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-red-100 p-3 rounded-lg">
                <XCircle size={24} className="text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expired/Cancelled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => ['expired', 'cancelled'].includes(u.subscription_status)).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by email, name, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <button
                onClick={exportUsers}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trial Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projects
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {editingUser === user.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editForm.first_name || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                placeholder="First name"
                              />
                              <input
                                type="text"
                                value={editForm.last_name || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                placeholder="Last name"
                              />
                            </div>
                          ) : (
                            `${user.first_name} ${user.last_name}`
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {editingUser === user.id ? (
                          <input
                            type="text"
                            value={editForm.phone_number || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, phone_number: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            placeholder="Phone number"
                          />
                        ) : (
                          user.phone_number
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser === user.id ? (
                        <select
                          value={editForm.subscription_status || user.subscription_status}
                          onChange={(e) => setEditForm(prev => ({ 
                            ...prev, 
                            subscription_status: e.target.value as any 
                          }))}
                          className="px-2 py-1 text-sm border border-gray-300 rounded"
                        >
                          <option value="trial">Trial</option>
                          <option value="active">Active</option>
                          <option value="expired">Expired</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.subscription_status, user.has_access)}`}>
                          {getStatusIcon(user.subscription_status, user.has_access)}
                          {user.subscription_status}
                        </span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>Ends: {formatDate(user.trial_end_date)}</div>
                        <div className={`text-xs ${user.days_remaining > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {user.days_remaining > 0 ? `${user.days_remaining} days left` : 'Expired'}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.project_count}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingUser === user.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Edit3 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600">
                {users.length === 0 
                  ? 'No users have signed up yet.' 
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
              {users.length === 0 && debugInfo && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md mx-auto">
                  <p className="text-sm text-yellow-800">
                    <strong>Debug:</strong> {debugInfo}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};