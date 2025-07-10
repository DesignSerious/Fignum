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
  Database,
  Lock,
  Unlock,
  Trash2,
  Eye,
  Activity,
  UserX
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
  avatar_url?: string;
  trial_start_date: string;
  trial_end_date: string;
  subscription_status: 'trial' | 'active' | 'expired' | 'cancelled';
  subscription_end_date?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  login_attempts: number;
  locked_until?: string;
  project_count: number;
  days_remaining: number;
  has_access: boolean;
  is_locked: boolean;
}

interface AdminLog {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  target_user_id?: string;
  target_user_email?: string;
  details: any;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

interface SecureAdminDashboardProps {
  onLogout: () => void;
}

export const SecureAdminDashboard: React.FC<SecureAdminDashboardProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminUser>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const [currentView, setCurrentView] = useState<'users' | 'logs'>('users');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Test Supabase connection
  const testConnection = async () => {
    console.log('Testing Supabase connection...');
    setError(null);
    
    if (!supabase) {
      const errorMsg = 'Supabase client not initialized. Check environment variables.';
      console.error(errorMsg);
      setError(errorMsg);
      setConnectionStatus('failed');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error('Connection test failed:', error);
        setError(`Database connection failed: ${error.message}`);
        setConnectionStatus('failed');
        return false;
      }

      console.log('Connection successful');
      setConnectionStatus('connected');
      return true;

    } catch (err) {
      console.error('Connection test error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown connection error';
      setError(`Connection failed: ${errorMessage}`);
      setConnectionStatus('failed');
      return false;
    }
  };

  // Fetch users with enhanced security info
  const fetchUsers = async () => {
    console.log('Starting fetchUsers...');
    setError(null);
    
    if (!supabase) {
      const errorMsg = 'Supabase not configured. Please check your environment variables.';
      console.error(errorMsg);
      setError(errorMsg);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Test connection first
      const connectionOk = await testConnection();
      if (!connectionOk) {
        setLoading(false);
        return;
      }
      
      // Call the secure admin function
      const { data, error } = await supabase.rpc('admin_get_all_users_secure');

      if (error) {
        console.error('Error fetching users:', error);
        setError(`Failed to fetch users: ${error.message}`);
        setLoading(false);
        return;
      }

      console.log('Fetched users:', data);
      setUsers(data || []);
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to fetch users: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch admin logs
  const fetchLogs = async () => {
    if (!supabase) return;

    try {
      setLogsLoading(true);
      const { data, error } = await supabase.rpc('get_admin_logs', {
        limit_count: 100,
        offset_count: 0
      });

      if (error) {
        console.error('Error fetching logs:', error);
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, []);

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone_number.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || user.subscription_status === statusFilter;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  // Handle user edit
  const handleEdit = (user: AdminUser) => {
    setEditingUser(user.id);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      role: user.role,
      subscription_status: user.subscription_status,
      subscription_end_date: user.subscription_end_date
    });
  };

  // Handle save user
  const handleSave = async () => {
    if (!editingUser || !supabase) return;

    try {
      setSaving(true);
      
      const { error } = await supabase.rpc('admin_update_user_secure', {
        target_user_id: editingUser,
        updates: editForm
      });

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

  // Handle lock user
  const handleLockUser = async (userId: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase.rpc('admin_lock_user', {
        target_user_id: userId,
        lock_duration: '1 hour'
      });

      if (error) throw error;

      await fetchUsers();
      await fetchLogs();
    } catch (error) {
      console.error('Error locking user:', error);
      alert('Failed to lock user. Please try again.');
    }
  };

  // Handle unlock user
  const handleUnlockUser = async (userId: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase.rpc('admin_unlock_user', {
        target_user_id: userId
      });

      if (error) throw error;

      await fetchUsers();
      await fetchLogs();
    } catch (error) {
      console.error('Error unlocking user:', error);
      alert('Failed to unlock user. Please try again.');
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase.rpc('admin_delete_user', {
        target_user_id: userId
      });

      if (error) throw error;

      await fetchUsers();
      await fetchLogs();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'admin': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportUsers = () => {
    const csvContent = [
      ['Email', 'First Name', 'Last Name', 'Phone', 'Role', 'Status', 'Trial End', 'Projects', 'Days Remaining', 'Has Access', 'Is Locked'].join(','),
      ...filteredUsers.map(user => [
        user.email,
        user.first_name,
        user.last_name,
        user.phone_number,
        user.role,
        user.subscription_status,
        formatDate(user.trial_end_date),
        user.project_count,
        user.days_remaining,
        user.has_access ? 'Yes' : 'No',
        user.is_locked ? 'Yes' : 'No'
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
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading secure admin dashboard...</p>
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
              <div className="bg-purple-100 p-2 rounded-lg">
                <Shield size={24} className="text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Secure Admin Panel</h1>
                <p className="text-sm text-purple-600 font-medium">Role-Based Access Control</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView('users')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'users' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <Users size={16} className="inline mr-2" />
                  Users
                </button>
                <button
                  onClick={() => setCurrentView('logs')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'logs' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <Activity size={16} className="inline mr-2" />
                  Audit Logs
                </button>
              </div>

              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {connectionStatus === 'connected' && (
                  <div className="flex items-center gap-1 text-green-600">
                    <Wifi size={16} />
                    <span className="text-sm">Secure</span>
                  </div>
                )}
                {connectionStatus === 'failed' && (
                  <div className="flex items-center gap-1 text-red-600">
                    <WifiOff size={16} />
                    <span className="text-sm">Disconnected</span>
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
                {currentView === 'users' ? `${filteredUsers.length} of ${users.length} users` : `${logs.length} log entries`}
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

        {/* Users View */}
        {currentView === 'users' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
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
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Shield size={24} className="text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Admins</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {users.filter(u => ['admin', 'super_admin'].includes(u.role)).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <CheckCircle size={24} className="text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {users.filter(u => u.subscription_status === 'active').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <Lock size={24} className="text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Locked</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {users.filter(u => u.is_locked).length}
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
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter size={16} className="text-gray-400" />
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="all">All Roles</option>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
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
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Security
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
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
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
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
                              <div className="text-sm text-gray-500">{user.phone_number}</div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingUser === user.id ? (
                            <select
                              value={editForm.role || user.role}
                              onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                              className="px-2 py-1 text-sm border border-gray-300 rounded"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                              {user.role === 'super_admin' ? 'Super Admin' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.subscription_status, user.has_access)}`}>
                            {getStatusIcon(user.subscription_status, user.has_access)}
                            {user.subscription_status}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="space-y-1">
                            {user.is_locked && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <Lock size={12} />
                                Locked
                              </span>
                            )}
                            {user.login_attempts > 0 && (
                              <div className="text-xs text-orange-600">
                                {user.login_attempts} failed attempts
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.last_login ? formatDate(user.last_login) : 'Never'}
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
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(user)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit user"
                              >
                                <Edit3 size={16} />
                              </button>
                              
                              {user.is_locked ? (
                                <button
                                  onClick={() => handleUnlockUser(user.id)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Unlock user"
                                >
                                  <Unlock size={16} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleLockUser(user.id)}
                                  className="text-orange-600 hover:text-orange-900"
                                  title="Lock user"
                                >
                                  <Lock size={16} />
                                </button>
                              )}
                              
                              <button
                                onClick={() => setShowDeleteConfirm(user.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete user"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
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
                </div>
              )}
            </div>
          </>
        )}

        {/* Logs View */}
        {currentView === 'logs' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Admin Activity Logs</h3>
                <button
                  onClick={fetchLogs}
                  disabled={logsLoading}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw size={16} className={logsLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.admin_email || 'System'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.target_user_email || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {log.ip_address && (
                          <div className="text-xs text-gray-500">
                            IP: {log.ip_address}
                          </div>
                        )}
                        {Object.keys(log.details || {}).length > 0 && (
                          <div className="text-xs text-gray-500 truncate">
                            {JSON.stringify(log.details).substring(0, 50)}...
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {logs.length === 0 && (
              <div className="text-center py-12">
                <Activity size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No activity logs</h3>
                <p className="text-gray-600">Admin actions will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-lg">
                <UserX size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Delete User Account
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to permanently delete this user account? This action cannot be undone and will remove all associated data.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};