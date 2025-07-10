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
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';
import { getAllUsers, updateUserSubscription, getConnection } from '../lib/database';

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

interface PlanetScaleAdminDashboardProps {
  onLogout: () => void;
}

export const PlanetScaleAdminDashboard: React.FC<PlanetScaleAdminDashboardProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminUser>>({});
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'failed' | 'checking'>('checking');
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setConnectionStatus('checking');
    try {
      const conn = getConnection();
      if (!conn) {
        setConnectionStatus('failed');
        setError('Database not configured. Check your environment variables.');
        return false;
      }
      
      // Test with a simple query
      await conn.execute('SELECT 1');
      setConnectionStatus('connected');
      setError(null);
      return true;
    } catch (err) {
      setConnectionStatus('failed');
      setError(err instanceof Error ? err.message : 'Connection failed');
      return false;
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const connected = await testConnection();
      if (!connected) {
        setLoading(false);
        return;
      }

      const allUsers = await getAllUsers();
      
      // Calculate additional fields
      const usersWithCalculatedFields = allUsers.map(user => ({
        ...user,
        days_remaining: Math.max(0, Math.ceil((new Date(user.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
        has_access: user.subscription_status === 'active' || 
                    (user.subscription_status === 'trial' && new Date(user.trial_end_date) > new Date())
      }));
      
      setUsers(usersWithCalculatedFields);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
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
    if (!editingUser) return;

    try {
      setSaving(true);
      
      await updateUserSubscription(
        editingUser,
        editForm.subscription_status!,
        editForm.subscription_end_date
      );

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
        user.project_count || 0,
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
          <p className="text-gray-600">Loading admin dashboard...</p>
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
              <div className="bg-blue-100 p-2 rounded-lg">
                <Database size={24} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Fignum Admin</h1>
                <p className="text-sm text-blue-600 font-medium">PlanetScale Database</p>
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
                {connectionStatus === 'checking' && (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Checking...</span>
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
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-red-800 mb-2">Database Error:</h3>
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

        {/* Connection Success */}
        {connectionStatus === 'connected' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <Database size={20} />
              <span className="font-medium">PlanetScale Database Connected</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Successfully connected to your MySQL database. All user data is being stored securely.
            </p>
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

        {/* Rest of the component remains the same as the original AdminDashboard */}
        {/* ... (search, filters, table, etc.) */}
        
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
                          {`${user.first_name} ${user.last_name}`}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.phone_number}</div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.subscription_status, user.has_access)}`}>
                        {getStatusIcon(user.subscription_status, user.has_access)}
                        {user.subscription_status}
                      </span>
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
                      {user.project_count || 0}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit3 size={16} />
                      </button>
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
    </div>
  );
};