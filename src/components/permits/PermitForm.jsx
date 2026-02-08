import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import FileUploader from './FileUploader';
import {
    ArrowLeft,
    Save,
    Loader2,
    MapPin,
    Calendar,
    FileText,
    Hash,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Helper function to get today's date in YYYY-MM-DD format
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Helper function to get date 15 days from today
function getEndDate() {
    const date = new Date();
    date.setDate(date.getDate() + 15);
    return date.toISOString().split('T')[0];
}

export default function PermitForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isSuperAdmin } = useAuth();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [schemaFields, setSchemaFields] = useState([]);
    const [statusOptions, setStatusOptions] = useState([]);
    const [files, setFiles] = useState([]);

    const [formData, setFormData] = useState({
        pre_permit_number: '',
        permit_number: '',
        location: '',
        excavation_type: '',
        location_area: '',
        start_date: getTodayDate(),
        end_date: getEndDate(),
        status: 'pending',
        notes: '',
        custom_fields: {},
    });

    useEffect(() => {
        fetchSchemaFields();
        fetchStatusOptions();
        if (isEditing) {
            fetchPermit();
        }
    }, [id]);

    async function fetchSchemaFields() {
        const { data, error } = await supabase
            .from('schema_fields')
            .select('*')
            .order('sort_order');

        if (!error && data) {
            setSchemaFields(data);
        }
    }

    async function fetchStatusOptions() {
        const { data, error } = await supabase
            .from('status_options')
            .select('*')
            .order('sort_order');

        if (!error && data) {
            setStatusOptions(data);
        }
    }

    async function fetchPermit() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('permits')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            setFormData({
                pre_permit_number: data.pre_permit_number || '',
                permit_number: data.permit_number || '',
                location: data.location,
                start_date: data.start_date,
                end_date: data.end_date || '',
                status: data.status,
                notes: data.notes || '',
                custom_fields: data.custom_fields || {},
            });

            // Convert file_urls array to file objects
            if (data.file_urls?.length > 0) {
                const fileObjects = data.file_urls.map((url, index) => ({
                    url,
                    name: `File ${index + 1}`,
                    format: url.split('.').pop()?.split('?')[0] || 'unknown',
                    size: 0,
                }));
                setFiles(fileObjects);
            }
        } catch (error) {
            toast.error('Failed to load permit');
            navigate('/');
        } finally {
            setLoading(false);
        }
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleCustomFieldChange = (fieldKey, value) => {
        setFormData((prev) => ({
            ...prev,
            custom_fields: {
                ...prev.custom_fields,
                [fieldKey]: value,
            },
        }));
    };

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);

        try {
            const permitData = {
                pre_permit_number: formData.pre_permit_number || null,
                permit_number: formData.permit_number || null,
                location: formData.location,
                contractor: '', // Empty string for legacy column
                start_date: formData.start_date,
                end_date: formData.end_date || null,
                status: formData.status,
                notes: formData.notes || null,
                custom_fields: formData.custom_fields,
                file_urls: files.map((f) => f.url),
            };

            if (isEditing) {
                const { error } = await supabase
                    .from('permits')
                    .update(permitData)
                    .eq('id', id);
                if (error) throw error;
                toast.success('Permit updated');
            } else {
                // For new permits, don't send permit_number if empty
                if (!permitData.permit_number) {
                    delete permitData.permit_number;
                }
                const { error } = await supabase
                    .from('permits')
                    .insert([{ ...permitData, created_by: user.id }]);
                if (error) throw error;
                toast.success('Permit created');
            }

            navigate('/');
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to save permit');
        } finally {
            setSaving(false);
        }
    }

    const renderCustomField = (field) => {
        const value = formData.custom_fields[field.field_key] ?? '';

        switch (field.field_type) {
            case 'text':
                return (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => handleCustomFieldChange(field.field_key, e.target.value)}
                        className="input"
                        required={field.required}
                    />
                );
            case 'number':
                return (
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => handleCustomFieldChange(field.field_key, e.target.value)}
                        className="input"
                        required={field.required}
                    />
                );
            case 'date':
                return (
                    <input
                        type="date"
                        value={value}
                        onChange={(e) => handleCustomFieldChange(field.field_key, e.target.value)}
                        className="input"
                        required={field.required}
                    />
                );
            case 'checkbox':
                return (
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={Boolean(value)}
                            onChange={(e) => handleCustomFieldChange(field.field_key, e.target.checked)}
                            className="w-5 h-5 rounded border-surface-300 text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-surface-600">Yes</span>
                    </label>
                );
            case 'select':
                const options = field.options || [];
                return (
                    <select
                        value={value}
                        onChange={(e) => handleCustomFieldChange(field.field_key, e.target.value)}
                        className="input"
                        required={field.required}
                    >
                        <option value="">Select an option</option>
                        {options.map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            case 'attachments':
                // Store attachments as array of URLs in custom_fields
                const attachmentFiles = Array.isArray(value) ? value.map((url, idx) => ({
                    url,
                    name: `File ${idx + 1}`,
                    format: url.split('.').pop()?.split('?')[0] || 'unknown',
                    size: 0,
                })) : [];
                return (
                    <FileUploader
                        files={attachmentFiles}
                        onFilesChange={(newFiles) => handleCustomFieldChange(field.field_key, newFiles.map(f => f.url))}
                        maxFiles={5}
                    />
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-in">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/')}
                    className="btn-ghost p-2"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-surface-900">
                        {isEditing ? 'Edit Permit' : 'New Permit'}
                    </h1>
                    <p className="text-surface-500 mt-1">
                        {isEditing ? 'Update permit details' : 'Create a new excavation permit'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold text-surface-900 mb-6 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary-500" />
                        Basic Information
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Pre Permit Number - Always shown */}
                        <div>
                            <label className="label">
                                <Hash className="w-4 h-4 inline mr-1" />
                                Pre Permit Number
                            </label>
                            <input
                                type="text"
                                name="pre_permit_number"
                                value={formData.pre_permit_number}
                                onChange={handleChange}
                                className="input"
                                placeholder="Enter pre-permit number"
                            />
                        </div>

                        {/* Permit Number - Only shown when editing */}
                        {isEditing && (
                            <div>
                                <label className="label">Permit Number</label>
                                <input
                                    type="text"
                                    name="permit_number"
                                    value={formData.permit_number}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="Enter permit number"
                                />
                            </div>
                        )}

                        <div>
                            <label className="label">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="input"
                                disabled={!isSuperAdmin && isEditing}
                            >
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

                        {/* Excavation Type */}
                        <div>
                            <label className="label">نوع الحفرية</label>
                            <select
                                name="excavation_type"
                                value={formData.excavation_type}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="">-- اختر --</option>
                                <option value="water">مياه</option>
                                <option value="sewage">صرف صحى</option>
                            </select>
                        </div>

                        {/* Location Area */}
                        <div>
                            <label className="label">المكان</label>
                            <select
                                name="location_area"
                                value={formData.location_area}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="">-- اختر --</option>
                                <option value="aloyoun">العيون</option>
                                <option value="alomran">العمران</option>
                                <option value="jawathi">جواثي</option>
                                <option value="aljafr">الجفر</option>
                                <option value="almubarraz">المبرز</option>
                                <option value="alhofuf">الهفوف</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="label">
                                <MapPin className="w-4 h-4 inline mr-1" />
                                Location
                            </label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                className="input"
                                placeholder="Enter excavation location"
                                required
                            />
                        </div>

                        <div>
                            <label className="label">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                Start Date
                            </label>
                            <input
                                type="date"
                                name="start_date"
                                value={formData.start_date}
                                onChange={handleChange}
                                className="input"
                                required
                            />
                        </div>

                        <div>
                            <label className="label">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                End Date
                            </label>
                            <input
                                type="date"
                                name="end_date"
                                value={formData.end_date}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="label">Notes</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                rows={3}
                                className="input resize-none"
                                placeholder="Additional notes..."
                            />
                        </div>
                    </div>
                </div>

                {/* Custom Fields */}
                {schemaFields.length > 0 && (
                    <div className="card p-6">
                        <h2 className="text-lg font-semibold text-surface-900 mb-6">
                            Additional Fields
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {schemaFields.map((field) => (
                                <div key={field.id} className={field.field_type === 'checkbox' ? 'flex items-center' : ''}>
                                    <label className="label">
                                        {field.label}
                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                    </label>
                                    {renderCustomField(field)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* File Upload */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold text-surface-900 mb-6">
                        Attachments
                    </h2>
                    <FileUploader
                        files={files}
                        onFilesChange={setFiles}
                        maxFiles={10}
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary"
                    >
                        {saving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Save className="w-5 h-5 mr-2" />
                                {isEditing ? 'Update Permit' : 'Create Permit'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
