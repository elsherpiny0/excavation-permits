import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Search, Users, Shield, Loader2, Check, Plus, X, UserPlus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UserManagement() {
    const { isSuperAdmin } = useAuth();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [savingUserId, setSavingUserId] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        fullName: '',
        role: 'staff'
    });
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editData, setEditData] = useState({ fullName: '', role: '' });

    useEffect(() => {
        fetchRoles();
        fetchUsers();
    }, []);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchUsers();
        }, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    async function fetchRoles() {
        const { data, error } = await supabase
            .from('roles')
            .select('*')
            .order('sort_order');
        if (!error && data) {
            setRoles(data);
        }
    }

    async function fetchUsers() {
        setLoading(true);
        try {
            let query = supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (searchQuery) {
                query = query.or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
            }

            const { data, error } = await query.limit(50);
            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            toast.error('فشل في تحميل المستخدمين');
        } finally {
            setLoading(false);
        }
    }

    async function handleRoleChange(userId, newRole) {
        setSavingUserId(userId);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;

            setUsers(users.map(u =>
                u.id === userId ? { ...u, role: newRole } : u
            ));
            toast.success('تم تحديث الصلاحية');
        } catch (error) {
            toast.error('فشل في تحديث الصلاحية');
        } finally {
            setSavingUserId(null);
        }
    }

    async function handleCreateUser(e) {
        e.preventDefault();
        if (!newUser.email || !newUser.password) {
            toast.error('البريد الإلكتروني وكلمة السر مطلوبين');
            return;
        }
        if (newUser.password.length < 6) {
            toast.error('كلمة السر يجب أن تكون 6 أحرف على الأقل');
            return;
        }

        setCreating(true);
        try {
            // If no @ symbol, treat as username and add domain
            const emailToUse = newUser.email.includes('@')
                ? newUser.email
                : `${newUser.email}@redrilla.com`;

            const { data, error } = await supabase.auth.signUp({
                email: emailToUse,
                password: newUser.password,
                options: {
                    data: {
                        full_name: newUser.fullName,
                        role: newUser.role,
                        username: newUser.email.includes('@') ? null : newUser.email,
                    },
                },
            });

            if (error) throw error;

            toast.success('تم إنشاء المستخدم بنجاح');
            setShowCreateModal(false);
            setNewUser({ email: '', password: '', fullName: '', role: 'staff' });
            fetchUsers();
        } catch (error) {
            toast.error(error.message || 'فشل في إنشاء المستخدم');
        } finally {
            setCreating(false);
        }
    }

    async function handleDeleteUser(userId) {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (error) throw error;

            setUsers(users.filter(u => u.id !== userId));
            toast.success('تم حذف المستخدم');
        } catch (error) {
            console.error('Delete user error:', error);
            toast.error(error.message || 'فشل في حذف المستخدم');
        }
    }

    function openEditModal(user) {
        setEditingUser(user);
        setEditData({ fullName: user.full_name || '', role: user.role || 'staff' });
        setShowEditModal(true);
    }

    async function handleEditUser(e) {
        e.preventDefault();
        if (!editingUser) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: editData.fullName,
                    role: editData.role
                })
                .eq('id', editingUser.id);

            if (error) throw error;

            setUsers(users.map(u =>
                u.id === editingUser.id
                    ? { ...u, full_name: editData.fullName, role: editData.role }
                    : u
            ));
            toast.success('تم تحديث بيانات المستخدم');
            setShowEditModal(false);
            setEditingUser(null);
        } catch (error) {
            toast.error(error.message || 'فشل في تحديث المستخدم');
        }
    }

    if (!isSuperAdmin) {
        return <Navigate to="/" replace />;
    }

    const getRoleLabel = (roleKey) => {
        const role = roles.find(r => r.role_key === roleKey);
        return role?.label_ar || roleKey;
    };

    return (
        <div className="max-w-4xl mx-auto animate-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-surface-900 flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary-500" />
                        إدارة المستخدمين
                    </h1>
                    <p className="text-surface-500 mt-1">
                        البحث عن المستخدمين وتعيين الصلاحيات
                    </p>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                    <UserPlus className="w-5 h-5 mr-2" />
                    إنشاء مستخدم
                </button>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pr-12 text-right"
                        placeholder="البحث بالبريد الإلكتروني أو الاسم..."
                        dir="rtl"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users className="w-12 h-12 text-surface-300 mx-auto mb-3" />
                        <p className="text-surface-500">لا يوجد مستخدمين</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full" dir="rtl">
                            <thead className="bg-surface-50 border-b border-surface-100">
                                <tr>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-surface-600">
                                        المستخدم
                                    </th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-surface-600">
                                        البريد الإلكتروني
                                    </th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-surface-600">
                                        الصلاحية
                                    </th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-surface-600">
                                        إجراءات
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-100">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-surface-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                                                    <span className="text-primary-600 font-semibold">
                                                        {(user.full_name || user.email || '?')[0].toUpperCase()}
                                                    </span>
                                                </div>
                                                <span className="font-medium text-surface-900">
                                                    {user.full_name || '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-surface-600 font-mono text-sm">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    className="input py-2 text-right min-w-[200px]"
                                                    disabled={savingUserId === user.id}
                                                    dir="rtl"
                                                >
                                                    {roles.map((role) => (
                                                        <option key={role.role_key} value={role.role_key}>
                                                            {role.label_ar}
                                                        </option>
                                                    ))}
                                                </select>
                                                {savingUserId === user.id && (
                                                    <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="p-2 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                                    title="تعديل"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="p-2 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                    title="حذف"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="card w-full max-w-md p-6 animate-in" dir="rtl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-surface-900">إنشاء مستخدم جديد</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="btn-ghost p-2"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="label">الاسم الكامل</label>
                                <input
                                    type="text"
                                    value={newUser.fullName}
                                    onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                                    className="input text-right"
                                    placeholder="أدخل الاسم"
                                />
                            </div>

                            <div>
                                <label className="label">البريد الإلكتروني أو اسم المستخدم *</label>
                                <input
                                    type="text"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    className="input"
                                    placeholder="email@example.com أو username"
                                    required
                                    dir="ltr"
                                />
                            </div>

                            <div>
                                <label className="label">كلمة السر *</label>
                                <input
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    className="input"
                                    placeholder="6 أحرف على الأقل"
                                    required
                                    minLength={6}
                                    dir="ltr"
                                />
                            </div>

                            <div>
                                <label className="label">الصلاحية</label>
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                    className="input text-right"
                                >
                                    {roles.map((role) => (
                                        <option key={role.role_key} value={role.role_key}>
                                            {role.label_ar}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    إلغاء
                                </button>
                                <button type="submit" disabled={creating} className="btn-primary flex-1">
                                    {creating ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <UserPlus className="w-5 h-5 ml-2" />
                                            إنشاء
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="card w-full max-w-md p-6 animate-in" dir="rtl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-surface-900">تعديل المستخدم</h2>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="btn-ghost p-2"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-4 p-3 bg-surface-50 rounded-lg">
                            <p className="text-sm text-surface-600">
                                <span className="font-medium">البريد:</span> {editingUser.email}
                            </p>
                        </div>

                        <form onSubmit={handleEditUser} className="space-y-4">
                            <div>
                                <label className="label">الاسم الكامل</label>
                                <input
                                    type="text"
                                    value={editData.fullName}
                                    onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                                    className="input text-right"
                                    placeholder="أدخل الاسم"
                                />
                            </div>

                            <div>
                                <label className="label">الصلاحية</label>
                                <select
                                    value={editData.role}
                                    onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                                    className="input text-right"
                                >
                                    {roles.map((role) => (
                                        <option key={role.role_key} value={role.role_key}>
                                            {role.label_ar}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    إلغاء
                                </button>
                                <button type="submit" className="btn-primary flex-1">
                                    <Check className="w-5 h-5 ml-2" />
                                    حفظ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
