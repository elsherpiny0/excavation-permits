import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Search,
    Filter,
    Plus,
    FileText,
    MapPin,
    Calendar,
    Users,
    MoreVertical,
    Eye,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const statusColors = {
    pending: 'badge-pending',
    approved: 'badge-approved',
    denied: 'badge-denied',
    completed: 'badge-completed',
};

export default function Dashboard() {
    const { isSuperAdmin } = useAuth();
    const [permits, setPermits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedPermit, setSelectedPermit] = useState(null);
    const perPage = 10;

    useEffect(() => {
        fetchPermits();
    }, [page, statusFilter, searchQuery]);

    async function fetchPermits() {
        setLoading(true);
        try {
            let query = supabase
                .from('permits')
                .select('*, profiles!permits_created_by_fkey(full_name, email)', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range((page - 1) * perPage, page * perPage - 1);

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            if (searchQuery) {
                query = query.or(`permit_number.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%,contractor.ilike.%${searchQuery}%`);
            }

            const { data, error, count } = await query;
            if (error) throw error;

            setPermits(data || []);
            setTotalCount(count || 0);
        } catch (error) {
            toast.error('Failed to load permits');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function deletePermit(id) {
        if (!confirm('Are you sure you want to delete this permit?')) return;

        try {
            const { error } = await supabase.from('permits').delete().eq('id', id);
            if (error) throw error;
            toast.success('Permit deleted');
            fetchPermits();
        } catch (error) {
            toast.error('Failed to delete permit');
        }
    }

    const totalPages = Math.ceil(totalCount / perPage);

    const stats = [
        { label: 'Total Permits', value: totalCount, icon: FileText, color: 'from-blue-500 to-blue-600' },
        { label: 'Pending', value: permits.filter(p => p.status === 'pending').length, icon: Calendar, color: 'from-amber-500 to-amber-600' },
        { label: 'Approved', value: permits.filter(p => p.status === 'approved').length, icon: MapPin, color: 'from-emerald-500 to-emerald-600' },
        { label: 'Contractors', value: [...new Set(permits.map(p => p.contractor))].length, icon: Users, color: 'from-purple-500 to-purple-600' },
    ];

    return (
        <div className="animate-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-surface-900">Dashboard</h1>
                    <p className="text-surface-500 mt-1">Manage excavation permits and track progress</p>
                </div>
                <Link to="/permits/new" className="btn-primary">
                    <Plus className="w-5 h-5 mr-2" />
                    New Permit
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <div key={index} className="card p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                                <stat.icon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-surface-900">{stat.value}</p>
                                <p className="text-sm text-surface-500">{stat.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="card p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                        <input
                            type="text"
                            placeholder="Search permits by number, location, or contractor..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(1);
                            }}
                            className="input pl-12"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                            className="input pl-12 pr-12 appearance-none cursor-pointer min-w-[180px]"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="denied">Denied</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Permits Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-surface-50 border-b border-surface-100">
                                <th className="text-left px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                    Permit Number
                                </th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                    Location
                                </th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                    Contractor
                                </th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                    Dates
                                </th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="text-left px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                    Created By
                                </th>
                                <th className="text-right px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                                    </td>
                                </tr>
                            ) : permits.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-surface-500">
                                        No permits found. Create your first permit to get started.
                                    </td>
                                </tr>
                            ) : (
                                permits.map((permit) => (
                                    <tr key={permit.id} className="hover:bg-surface-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-mono font-medium text-primary-600">
                                                {permit.permit_number}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-surface-400" />
                                                <span className="text-surface-700">{permit.location}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-surface-700">{permit.contractor}</td>
                                        <td className="px-6 py-4 text-surface-600 text-sm">
                                            {new Date(permit.start_date).toLocaleDateString()}
                                            {permit.end_date && ` - ${new Date(permit.end_date).toLocaleDateString()}`}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={statusColors[permit.status]}>
                                                {permit.status.charAt(0).toUpperCase() + permit.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-surface-600 text-sm">
                                            {permit.profiles?.full_name || permit.profiles?.email || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    to={`/permits/${permit.id}`}
                                                    className="p-2 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                                    title="View"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <Link
                                                    to={`/permits/${permit.id}/edit`}
                                                    className="p-2 rounded-lg text-surface-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                {isSuperAdmin && (
                                                    <button
                                                        onClick={() => deletePermit(permit.id)}
                                                        className="p-2 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-surface-100 bg-surface-50">
                        <p className="text-sm text-surface-500">
                            Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, totalCount)} of {totalCount} permits
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(page - 1)}
                                disabled={page === 1}
                                className="btn-ghost p-2"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const pageNum = i + 1;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={`w-10 h-10 rounded-lg font-medium transition-colors ${page === pageNum
                                                ? 'bg-primary-500 text-white'
                                                : 'text-surface-600 hover:bg-surface-100'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={page === totalPages}
                                className="btn-ghost p-2"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
