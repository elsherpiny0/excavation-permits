import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import {
    Users,
    UserPlus,
    Shield,
    ShieldCheck,
    Mail,
    Loader2,
    X,
    Check,
    AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function UserManagement() {
    const { isSuperAdmin, user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviting, setInviting] = useState(false);
    const [inviteData, setInviteData] = useState({
        email: '',
        fullName: '',
        role: 'staff',
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    }

    async function handleInvite(e) {
        e.preventDefault();
        setInviting(true);

        try {
            // Note: In production, you'd use Supabase's invite user API
            // or a server-side function to send invites
            // For now, we'll create a user with a temporary password

            const { data, error } = await supabase.auth.signUp({
                email: inviteData.email,
                password: crypto.randomUUID().slice(0, 12), // Temporary password
                options: {
                    data: {
                        full_name: inviteData.fullName,
                        role: inviteData.role,
                    },
                },
            });

            if (error) throw error;

            toast.success(`Invitation sent to ${inviteData.email}`);
            setShowInviteModal(false);
            setInviteData({ email: '', fullName: '', role: 'staff' });

            // Wait a moment for the profile trigger to run
            setTimeout(fetchUsers, 1000);
        } catch (error) {
            toast.error(error.message || 'Failed to invite user');
        } finally {
            setInviting(false);
        }
    }

    async function updateRole(userId, newRole) {
        if (userId === currentUser.id) {
            toast.error("You cannot change your own role");
            return;
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            toast.success('Role updated');
            fetchUsers();
        } catch (error) {
            toast.error('Failed to update role');
        }
    }

    if (!isSuperAdmin) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="max-w-4xl mx-auto animate-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-surface-900 flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary-500" />
                        User Management
                    </h1>
                    <p className="text-surface-500 mt-1">
                        Invite users and manage their roles
                    </p>
                </div>
                <button onClick={() => setShowInviteModal(true)} className="btn-primary">
                    <UserPlus className="w-5 h-5 mr-2" />
                    Invite User
                </button>
            </div>

            {/* Info Card */}
            <div className="card p-4 mb-6 bg-blue-50 border-blue-100">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-medium text-blue-900">Role Permissions</p>
                        <ul className="text-blue-700 mt-1 space-y-1">
                            <li><strong>Super Admin:</strong> Full access - manage users, schema, and all permits</li>
                            <li><strong>Staff:</strong> Can view all permits and create/edit their own</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Users List */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="bg-surface-50 border-b border-surface-100">
                                <th className="text-left px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                    Joined
                                </th>
                                <th className="text-right px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-surface-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                                                {u.full_name?.charAt(0) || u.email?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-surface-900">
                                                    {u.full_name || 'No name'}
                                                    {u.id === currentUser.id && (
                                                        <span className="ml-2 text-xs text-surface-500">(You)</span>
                                                    )}
                                                </p>
                                                <p className="text-sm text-surface-500">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${u.role === 'super_admin'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-surface-100 text-surface-700'
                                            }`}>
                                            {u.role === 'super_admin' ? (
                                                <ShieldCheck className="w-4 h-4" />
                                            ) : (
                                                <Shield className="w-4 h-4" />
                                            )}
                                            {u.role === 'super_admin' ? 'Super Admin' : 'Staff'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-surface-600 text-sm">
                                        {new Date(u.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {u.id !== currentUser.id && (
                                            <select
                                                value={u.role}
                                                onChange={(e) => updateRole(u.id, e.target.value)}
                                                className="input py-2 px-3 text-sm w-auto"
                                            >
                                                <option value="staff">Staff</option>
                                                <option value="super_admin">Super Admin</option>
                                            </select>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="card w-full max-w-md p-6 animate-in">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-surface-900">Invite User</h2>
                            <button
                                onClick={() => setShowInviteModal(false)}
                                className="btn-ghost p-2"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="label">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                                    <input
                                        type="email"
                                        value={inviteData.email}
                                        onChange={(e) =>
                                            setInviteData({ ...inviteData, email: e.target.value })
                                        }
                                        className="input pl-12"
                                        placeholder="user@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Full Name</label>
                                <input
                                    type="text"
                                    value={inviteData.fullName}
                                    onChange={(e) =>
                                        setInviteData({ ...inviteData, fullName: e.target.value })
                                    }
                                    className="input"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className="label">Role</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setInviteData({ ...inviteData, role: 'staff' })}
                                        className={`flex items-center gap-2 p-4 rounded-xl border transition-all ${inviteData.role === 'staff'
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-surface-200 hover:border-surface-300'
                                            }`}
                                    >
                                        <Shield className={`w-5 h-5 ${inviteData.role === 'staff' ? 'text-primary-500' : 'text-surface-400'}`} />
                                        <div className="text-left">
                                            <p className="font-medium text-surface-900">Staff</p>
                                            <p className="text-xs text-surface-500">Basic access</p>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInviteData({ ...inviteData, role: 'super_admin' })}
                                        className={`flex items-center gap-2 p-4 rounded-xl border transition-all ${inviteData.role === 'super_admin'
                                                ? 'border-purple-500 bg-purple-50'
                                                : 'border-surface-200 hover:border-surface-300'
                                            }`}
                                    >
                                        <ShieldCheck className={`w-5 h-5 ${inviteData.role === 'super_admin' ? 'text-purple-500' : 'text-surface-400'}`} />
                                        <div className="text-left">
                                            <p className="font-medium text-surface-900">Super Admin</p>
                                            <p className="text-xs text-surface-500">Full access</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button type="submit" disabled={inviting} className="btn-primary flex-1">
                                    {inviting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <UserPlus className="w-5 h-5 mr-2" />
                                            Send Invite
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
