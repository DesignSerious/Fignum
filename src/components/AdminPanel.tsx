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
  Trash2,
  Lock,
  Unlock,
  UserX
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
  is_locked?: boolean;
}

interface AdminPanelProps {
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminUser>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!supabase) {
      setError('Supabase not configured. Please check your environment variables.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch user profiles directly
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*');

      if (profilesError) {
        throw profilesError;
      }

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Fetch project counts for each user
      const { data: projectCounts, error: projectError } = await supabase
        .from('projects')
        .select('user_id');

      if (projectError) {
        console.warn('Error fetching projects (non-fatal):', projectError);
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
        }
      } catch (authErr) {
        console.warn('Auth users fetch failed:', authErr);
      }

      // Combine the data
      const combinedUsers: AdminUser[] = profiles.map((profile, index) => {
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
          has_access: hasAccess,
          is_locked: false // Default value
        };
      });

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const handleDelete = async (userId: string) => {
    if (!supabase) return;

    try {
      // First, delete the user's projects
      const { error: projectsError } = await supabase
        .from('projects')
        .delete()
        .eq('user_id', userId);

      if (projectsError) {
        console.warn('Error deleting user projects:', projectsError);
      }

      // Then delete the user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      // Finally, delete the auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) throw authError;

      await fetchUsers(); // Refresh data
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
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
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
                <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
                <p className="text-sm text-purple-600 font-medium">User Management</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
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
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Retry
              </button>
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
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-400" />
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit user"
                          >
                            <Edit3 size={16} />
                          </button>
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
                onClick={() => handleDelete(showDeleteConfirm)}
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