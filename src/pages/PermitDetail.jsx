import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    ArrowLeft,
    Edit,
    Trash2,
    MapPin,
    User,
    Calendar,
    FileText,
    Paperclip,
    ExternalLink,
    Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const statusColors = {
    pending: 'badge-pending',
    approved: 'badge-approved',
    denied: 'badge-denied',
    completed: 'badge-completed',
};

export default function PermitDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isSuperAdmin } = useAuth();
    const [permit, setPermit] = useState(null);
    const [schemaFields, setSchemaFields] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPermit();
        fetchSchemaFields();
    }, [id]);

    async function fetchPermit() {
        try {
            const { data, error } = await supabase
                .from('permits')
                .select('*, profiles!permits_created_by_fkey(full_name, email)')
                .eq('id', id)
                .single();

            if (error) throw error;
            setPermit(data);
        } catch (error) {
            toast.error('Failed to load permit');
            navigate('/');
        } finally {
            setLoading(false);
        }
    }

    async function fetchSchemaFields() {
        const { data } = await supabase
            .from('schema_fields')
            .select('*')
            .order('sort_order');
        if (data) setSchemaFields(data);
    }

    async function deletePermit() {
        if (!confirm('Are you sure you want to delete this permit?')) return;

        try {
            const { error } = await supabase.from('permits').delete().eq('id', id);
            if (error) throw error;
            toast.success('Permit deleted');
            navigate('/');
        } catch (error) {
            toast.error('Failed to delete permit');
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (!permit) return null;

    return (
        <div className="max-w-4xl mx-auto animate-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="btn-ghost p-2">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-surface-900">
                                {permit.permit_number}
                            </h1>
                            <span className={statusColors[permit.status]}>
                                {permit.status.charAt(0).toUpperCase() + permit.status.slice(1)}
                            </span>
                        </div>
                        <p className="text-surface-500 mt-1">
                            Created on {new Date(permit.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link to={`/permits/${id}/edit`} className="btn-secondary">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                    </Link>
                    {isSuperAdmin && (
                        <button onClick={deletePermit} className="btn-danger">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </button>
                    )}
                </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card p-6">
                        <h2 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary-500" />
                            Permit Details
                        </h2>

                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <dt className="text-sm text-surface-500 mb-1 flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    Location
                                </dt>
                                <dd className="text-surface-900 font-medium">{permit.location}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-surface-500 mb-1 flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    Contractor
                                </dt>
                                <dd className="text-surface-900 font-medium">{permit.contractor}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-surface-500 mb-1 flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    Start Date
                                </dt>
                                <dd className="text-surface-900 font-medium">
                                    {new Date(permit.start_date).toLocaleDateString()}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm text-surface-500 mb-1 flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    End Date
                                </dt>
                                <dd className="text-surface-900 font-medium">
                                    {permit.end_date
                                        ? new Date(permit.end_date).toLocaleDateString()
                                        : 'Not specified'}
                                </dd>
                            </div>
                        </dl>

                        {permit.notes && (
                            <div className="mt-6 pt-6 border-t border-surface-100">
                                <h3 className="text-sm text-surface-500 mb-2">Notes</h3>
                                <p className="text-surface-700">{permit.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Custom Fields */}
                    {Object.keys(permit.custom_fields || {}).length > 0 && (
                        <div className="card p-6">
                            <h2 className="text-lg font-semibold text-surface-900 mb-4">
                                Additional Information
                            </h2>

                            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {schemaFields
                                    .filter((f) => permit.custom_fields[f.field_key] !== undefined)
                                    .map((field) => (
                                        <div key={field.id}>
                                            <dt className="text-sm text-surface-500 mb-1">{field.label}</dt>
                                            <dd className="text-surface-900 font-medium">
                                                {field.field_type === 'checkbox'
                                                    ? permit.custom_fields[field.field_key]
                                                        ? 'Yes'
                                                        : 'No'
                                                    : permit.custom_fields[field.field_key] || '-'}
                                            </dd>
                                        </div>
                                    ))}
                            </dl>
                        </div>
                    )}

                    {/* Attachments */}
                    {permit.file_urls?.length > 0 && (
                        <div className="card p-6">
                            <h2 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
                                <Paperclip className="w-5 h-5 text-primary-500" />
                                Attachments ({permit.file_urls.length})
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {permit.file_urls.map((url, index) => {
                                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                                    return (
                                        <a
                                            key={index}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors group"
                                        >
                                            {isImage ? (
                                                <img
                                                    src={url}
                                                    alt={`Attachment ${index + 1}`}
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-surface-200 flex items-center justify-center">
                                                    <FileText className="w-6 h-6 text-surface-500" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-surface-900 truncate">
                                                    Attachment {index + 1}
                                                </p>
                                                <p className="text-xs text-surface-500">Click to view</p>
                                            </div>
                                            <ExternalLink className="w-4 h-4 text-surface-400 group-hover:text-primary-500" />
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="card p-6">
                        <h3 className="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-4">
                            Created By
                        </h3>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                                {permit.profiles?.full_name?.charAt(0) ||
                                    permit.profiles?.email?.charAt(0) ||
                                    'U'}
                            </div>
                            <div>
                                <p className="font-medium text-surface-900">
                                    {permit.profiles?.full_name || 'Unknown'}
                                </p>
                                <p className="text-sm text-surface-500">{permit.profiles?.email}</p>
                            </div>
                        </div>
                    </div>

                    <div className="card p-6">
                        <h3 className="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-4">
                            Timeline
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-surface-500">Created</span>
                                <span className="text-surface-900">
                                    {new Date(permit.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-surface-500">Last Updated</span>
                                <span className="text-surface-900">
                                    {new Date(permit.updated_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
