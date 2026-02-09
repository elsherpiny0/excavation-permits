import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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
    X,
    FileInput,
    CheckCircle,
    ClipboardList,
} from 'lucide-react';
import toast from 'react-hot-toast';

const statusColorClasses = {
    gray: 'bg-gray-100 text-gray-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
    teal: 'bg-teal-100 text-teal-700',
};

const excavationTypeLabels = {
    water: 'مياه',
    sewage: 'صرف صحى',
};

const locationAreaLabels = {
    aloyoun: 'العيون',
    alomran: 'العمران',
    jawathi: 'جواثي',
    aljafr: 'الجفر',
    almubarraz: 'المبرز',
    alhofuf: 'الهفوف',
};

export default function Dashboard() {
    const { isSuperAdmin, profile } = useAuth();
    const [permits, setPermits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [statusOptions, setStatusOptions] = useState([]);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedPermit, setSelectedPermit] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [requestModal, setRequestModal] = useState({ open: false, type: null, permit: null });
    const [requestNumber, setRequestNumber] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const perPage = 10;

    useEffect(() => {
        fetchStatusOptions();
    }, []);

    useEffect(() => {
        fetchPermits();
    }, [page, statusFilter, searchQuery]);

    async function fetchStatusOptions() {
        const { data, error } = await supabase
            .from('status_options')
            .select('*')
            .order('sort_order');
        if (!error && data) {
            setStatusOptions(data);
        }
    }

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

            // Role-based filtering for NWC users
            const userRole = profile?.role;
            console.log('User role:', userRole);

            if (userRole === 'nwc_sewage_omran') {
                // Sewage Omran: pending_send + sewage + (alomran, jawathi, aljafr, almubarraz)
                query = query
                    .eq('status', 'pending_send')
                    .eq('excavation_type', 'sewage')
                    .in('location_area', ['alomran', 'jawathi', 'aljafr', 'almubarraz']);
            } else if (userRole === 'nwc_sewage_oyoun') {
                // Sewage Oyoun: pending_send + sewage + aloyoun
                query = query
                    .eq('status', 'pending_send')
                    .eq('excavation_type', 'sewage')
                    .eq('location_area', 'aloyoun');
            } else if (userRole === 'nwc_water') {
                // Water: pending_send + water
                query = query
                    .eq('status', 'pending_send')
                    .eq('excavation_type', 'water');
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

    async function handleRequestSubmit() {
        if (!requestNumber.trim()) {
            toast.error('رقم الطلب مطلوب');
            return;
        }

        setSubmitting(true);
        try {
            const { type, permit } = requestModal;
            let updateData = { status: 'pending_send' };

            if (type === 'permit') {
                updateData.permit_request_number = requestNumber;
                updateData.current_request_type = 'permit';
            } else if (type === 'work_completion') {
                updateData.work_completion_request_number = requestNumber;
                updateData.current_request_type = 'work_completion';
            } else if (type === 'clearance') {
                updateData.clearance_request_number = requestNumber;
                updateData.current_request_type = 'clearance';
            }

            const { error } = await supabase
                .from('permits')
                .update(updateData)
                .eq('id', permit.id);

            if (error) throw error;

            toast.success('تم حفظ رقم الطلب بنجاح');
            setRequestModal({ open: false, type: null, permit: null });
            setRequestNumber('');
            fetchPermits();
        } catch (error) {
            console.error('Request error:', error);
            toast.error(error.message || 'فشل في حفظ الطلب');
        } finally {
            setSubmitting(false);
        }
    }

    function getAvailableActions(permit) {
        const actions = [];
        const status = permit.status;

        // طلب رخصة جديدة - only for new/pre_permit
        if (status === 'new' || status === 'pending' || status === 'pre_permit') {
            actions.push({ key: 'permit', label: 'طلب رخصة جديدة', icon: FileInput });
        }

        // طلب اتمام اعمال - only for pending_work_completion
        if (status === 'pending_work_completion') {
            actions.push({ key: 'work_completion', label: 'طلب اتمام اعمال', icon: CheckCircle });
        }

        // طلب اخلاء طرف - only for pending_clearance
        if (status === 'pending_clearance') {
            actions.push({ key: 'clearance', label: 'طلب اخلاء طرف', icon: ClipboardList });
        }

        return actions;
    }

    function getRequestTypeLabel(type) {
        const labels = {
            permit: 'طلب رخصة جديدة',
            work_completion: 'طلب اتمام اعمال',
            clearance: 'طلب اخلاء طرف',
        };
        return labels[type] || '';
    }

    const totalPages = Math.ceil(totalCount / perPage);

    const stats = [
        { label: 'Total Permits', value: totalCount, icon: FileText, color: 'from-blue-500 to-blue-600' },
        { label: 'Pending', value: permits.filter(p => p.status === 'pending').length, icon: Calendar, color: 'from-amber-500 to-amber-600' },
        { label: 'Approved', value: permits.filter(p => p.status === 'approved').length, icon: MapPin, color: 'from-emerald-500 to-emerald-600' },
        { label: 'Contractors', value: [...new Set(permits.map(p => p.contractor))].length, icon: Users, color: 'from-purple-500 to-purple-600' },
    ];

    return (
        <>
            <div className="animate-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-surface-900">Dashboard</h1>
                        <p className="text-surface-500 mt-1">Manage excavation permits and track progress</p>
                    </div>
                    {isSuperAdmin && (
                        <Link to="/permits/new" className="btn-primary">
                            <Plus className="w-5 h-5 mr-2" />
                            New Permit
                        </Link>
                    )}
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
                                {statusOptions.length > 0 ? (
                                    statusOptions.map((opt) => (
                                        <option key={opt.status_key} value={opt.status_key}>
                                            {opt.label}
                                        </option>
                                    ))
                                ) : (
                                    <>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="denied">Denied</option>
                                        <option value="completed">Completed</option>
                                    </>
                                )}
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
                                        Pre Permit #
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                        نوع الحفرية
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                        المكان
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                        Dates
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                        رقم الطلب
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
                                        <td colSpan="10" className="px-6 py-12 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                                        </td>
                                    </tr>
                                ) : permits.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="px-6 py-12 text-center text-surface-500">
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
                                            <td className="px-6 py-4 text-surface-700 font-mono">{permit.pre_permit_number || '-'}</td>
                                            <td className="px-6 py-4 text-surface-700">
                                                {permit.excavation_type ? (
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${permit.excavation_type === 'water' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {excavationTypeLabels[permit.excavation_type] || '-'}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-surface-700">
                                                {locationAreaLabels[permit.location_area] || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-surface-600 text-sm">
                                                {new Date(permit.start_date).toLocaleDateString()}
                                                {permit.end_date && ` - ${new Date(permit.end_date).toLocaleDateString()}`}
                                            </td>
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    const statusOpt = statusOptions.find(s => s.status_key === permit.status);
                                                    const colorClass = statusOpt ? (statusColorClasses[statusOpt.color] || 'bg-gray-100 text-gray-700') : 'bg-gray-100 text-gray-700';
                                                    const label = statusOpt?.label || (permit.status?.charAt(0).toUpperCase() + permit.status?.slice(1)) || '-';
                                                    return (
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                                                            {label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-4">
                                                {permit.permit_request_number || permit.work_completion_request_number || permit.clearance_request_number ? (
                                                    <span className="px-2 py-1 bg-primary-50 text-primary-700 rounded-lg text-sm font-mono">
                                                        {permit.permit_request_number || permit.work_completion_request_number || permit.clearance_request_number}
                                                    </span>
                                                ) : (
                                                    <span className="text-surface-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-surface-600 text-sm">
                                                {permit.profiles?.full_name || permit.profiles?.email || 'Unknown'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Workflow Actions Dropdown */}
                                                    {getAvailableActions(permit).length > 0 && (
                                                        <div className="relative">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenMenuId(openMenuId === permit.id ? null : permit.id);
                                                                }}
                                                                className="p-2 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                                                title="إجراءات"
                                                            >
                                                                <MoreVertical className="w-4 h-4" />
                                                            </button>
                                                            {openMenuId === permit.id && (
                                                                <>
                                                                    <div
                                                                        className="fixed inset-0 z-40"
                                                                        onClick={() => setOpenMenuId(null)}
                                                                    />
                                                                    <div className="absolute right-0 bottom-full mb-1 w-48 bg-white rounded-xl shadow-xl border border-surface-200 py-2 z-50 animate-in" dir="rtl">
                                                                        {getAvailableActions(permit).map((action) => (
                                                                            <button
                                                                                key={action.key}
                                                                                onClick={() => {
                                                                                    setOpenMenuId(null);
                                                                                    setRequestModal({ open: true, type: action.key, permit });
                                                                                }}
                                                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                                                                            >
                                                                                <action.icon className="w-4 h-4" />
                                                                                {action.label}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                    <Link
                                                        to={`/permits/${permit.id}`}
                                                        className="p-2 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                                        title="View"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    {isSuperAdmin && (
                                                        <Link
                                                            to={`/permits/${permit.id}/edit`}
                                                            className="p-2 rounded-lg text-surface-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Link>
                                                    )}
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

            {/* Request Number Modal */}
            {
                requestModal.open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setRequestModal({ open: false, type: null, permit: null })}>
                        <div className="card w-full max-w-md p-6 animate-in" dir="rtl" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-surface-900">{getRequestTypeLabel(requestModal.type)}</h2>
                                <button
                                    onClick={() => setRequestModal({ open: false, type: null, permit: null })}
                                    className="btn-ghost p-2"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="mb-4 p-3 bg-surface-50 rounded-lg">
                                <p className="text-sm text-surface-600">
                                    <span className="font-medium">رقم الرخصة:</span> {requestModal.permit?.permit_number}
                                </p>
                                <p className="text-sm text-surface-600">
                                    <span className="font-medium">الموقع:</span> {requestModal.permit?.location}
                                </p>
                            </div>

                            <div className="mb-6">
                                <label className="label">رقم الطلب *</label>
                                <input
                                    type="text"
                                    value={requestNumber}
                                    onChange={(e) => setRequestNumber(e.target.value)}
                                    className="input text-right"
                                    placeholder="أدخل رقم الطلب"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRequestModal({ open: false, type: null, permit: null })}
                                    className="btn-secondary flex-1"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleRequestSubmit}
                                    disabled={submitting}
                                    className="btn-primary flex-1"
                                >
                                    {submitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        'تأكيد'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}

