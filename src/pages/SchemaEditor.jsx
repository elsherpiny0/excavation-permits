import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import {
    Plus,
    Save,
    Trash2,
    GripVertical,
    Settings,
    Type,
    Hash,
    Calendar,
    CheckSquare,
    List,
    Loader2,
    X,
    Paperclip,
} from 'lucide-react';
import toast from 'react-hot-toast';

const fieldTypes = [
    { value: 'text', label: 'Text', icon: Type },
    { value: 'number', label: 'Number', icon: Hash },
    { value: 'date', label: 'Date', icon: Calendar },
    { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
    { value: 'select', label: 'Dropdown', icon: List },
    { value: 'attachments', label: 'Attachments', icon: Paperclip },
];

export default function SchemaEditor() {
    const { isSuperAdmin } = useAuth();
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingField, setEditingField] = useState(null);

    const [newField, setNewField] = useState({
        label: '',
        field_key: '',
        field_type: 'text',
        required: false,
        options: [],
    });

    useEffect(() => {
        fetchFields();
    }, []);

    async function fetchFields() {
        try {
            const { data, error } = await supabase
                .from('schema_fields')
                .select('*')
                .order('sort_order');
            if (error) throw error;
            setFields(data || []);
        } catch (error) {
            toast.error('Failed to load fields');
        } finally {
            setLoading(false);
        }
    }

    const generateFieldKey = (label) => {
        return label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '');
    };

    const handleLabelChange = (e) => {
        const label = e.target.value;
        setNewField({
            ...newField,
            label,
            field_key: generateFieldKey(label),
        });
    };

    async function handleAddField(e) {
        e.preventDefault();
        if (!newField.label || !newField.field_key) {
            toast.error('Please fill in all required fields');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.from('schema_fields').insert([
                {
                    label: newField.label,
                    field_key: newField.field_key,
                    field_type: newField.field_type,
                    required: newField.required,
                    options: newField.field_type === 'select' ? newField.options : [],
                    sort_order: fields.length,
                },
            ]);

            if (error) throw error;

            toast.success('Field added successfully');
            setShowAddModal(false);
            setNewField({
                label: '',
                field_key: '',
                field_type: 'text',
                required: false,
                options: [],
            });
            fetchFields();
        } catch (error) {
            toast.error(error.message || 'Failed to add field');
        } finally {
            setSaving(false);
        }
    }

    async function handleUpdateField(field) {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('schema_fields')
                .update({
                    label: field.label,
                    field_type: field.field_type,
                    required: field.required,
                    options: field.options,
                })
                .eq('id', field.id);

            if (error) throw error;
            toast.success('Field updated');
            setEditingField(null);
            fetchFields();
        } catch (error) {
            toast.error('Failed to update field');
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteField(id) {
        if (!confirm('Are you sure? This will not delete existing data but the field will no longer appear in forms.')) {
            return;
        }

        try {
            const { error } = await supabase.from('schema_fields').delete().eq('id', id);
            if (error) throw error;
            toast.success('Field deleted');
            fetchFields();
        } catch (error) {
            toast.error('Failed to delete field');
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
                        <Settings className="w-8 h-8 text-primary-500" />
                        Schema Editor
                    </h1>
                    <p className="text-surface-500 mt-1">
                        Define custom fields that appear in permit forms
                    </p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="btn-primary">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Field
                </button>
            </div>

            {/* Fields List */}
            <div className="card">
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                    </div>
                ) : fields.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                            <Settings className="w-8 h-8 text-surface-400" />
                        </div>
                        <h3 className="text-lg font-medium text-surface-900 mb-2">
                            No custom fields yet
                        </h3>
                        <p className="text-surface-500 mb-6">
                            Add custom fields to collect additional information on permits
                        </p>
                        <button onClick={() => setShowAddModal(true)} className="btn-primary">
                            <Plus className="w-5 h-5 mr-2" />
                            Add Your First Field
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-surface-100">
                        {fields.map((field) => {
                            const FieldIcon = fieldTypes.find(t => t.value === field.field_type)?.icon || Type;
                            const isEditing = editingField?.id === field.id;

                            return (
                                <div key={field.id} className="p-4 hover:bg-surface-50 transition-colors">
                                    {isEditing ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="label">Label</label>
                                                    <input
                                                        type="text"
                                                        value={editingField.label}
                                                        onChange={(e) =>
                                                            setEditingField({ ...editingField, label: e.target.value })
                                                        }
                                                        className="input"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="label">Type</label>
                                                    <select
                                                        value={editingField.field_type}
                                                        onChange={(e) =>
                                                            setEditingField({ ...editingField, field_type: e.target.value })
                                                        }
                                                        className="input"
                                                    >
                                                        {fieldTypes.map((type) => (
                                                            <option key={type.value} value={type.value}>
                                                                {type.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {editingField.field_type === 'select' && (
                                                <div>
                                                    <label className="label">Options (comma-separated)</label>
                                                    <input
                                                        type="text"
                                                        value={(editingField.options || []).join(', ')}
                                                        onChange={(e) =>
                                                            setEditingField({
                                                                ...editingField,
                                                                options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                                            })
                                                        }
                                                        className="input"
                                                        placeholder="Option 1, Option 2, Option 3"
                                                    />
                                                </div>
                                            )}

                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={editingField.required}
                                                        onChange={(e) =>
                                                            setEditingField({ ...editingField, required: e.target.checked })
                                                        }
                                                        className="w-4 h-4 rounded border-surface-300 text-primary-500"
                                                    />
                                                    <span className="text-sm text-surface-700">Required field</span>
                                                </label>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleUpdateField(editingField)}
                                                    disabled={saving}
                                                    className="btn-primary"
                                                >
                                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingField(null)}
                                                    className="btn-secondary"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center">
                                                <FieldIcon className="w-5 h-5 text-surface-500" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-surface-900">{field.label}</span>
                                                    {field.required && (
                                                        <span className="badge bg-red-100 text-red-700">Required</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-surface-500">
                                                    {fieldTypes.find((t) => t.value === field.field_type)?.label} • Key: {field.field_key}
                                                    {field.field_type === 'select' && field.options?.length > 0 && (
                                                        <span> • {field.options.length} options</span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setEditingField({ ...field })}
                                                    className="btn-ghost p-2"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteField(field.id)}
                                                    className="btn-ghost p-2 text-red-500 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Field Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="card w-full max-w-lg p-6 animate-in">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-surface-900">Add Custom Field</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="btn-ghost p-2"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddField} className="space-y-4">
                            <div>
                                <label className="label">Field Label</label>
                                <input
                                    type="text"
                                    value={newField.label}
                                    onChange={handleLabelChange}
                                    className="input"
                                    placeholder="e.g. Depth of Excavation"
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">Field Key</label>
                                <input
                                    type="text"
                                    value={newField.field_key}
                                    onChange={(e) => setNewField({ ...newField, field_key: e.target.value })}
                                    className="input bg-surface-50"
                                    placeholder="Auto-generated from label"
                                />
                                <p className="text-xs text-surface-500 mt-1">
                                    Unique identifier used in the database
                                </p>
                            </div>

                            <div>
                                <label className="label">Field Type</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {fieldTypes.map((type) => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => setNewField({ ...newField, field_type: type.value })}
                                            className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${newField.field_type === type.value
                                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                : 'border-surface-200 hover:border-surface-300'
                                                }`}
                                        >
                                            <type.icon className="w-4 h-4" />
                                            <span className="text-sm font-medium">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {newField.field_type === 'select' && (
                                <div>
                                    <label className="label">Dropdown Options</label>
                                    <input
                                        type="text"
                                        value={newField.options.join(', ')}
                                        onChange={(e) =>
                                            setNewField({
                                                ...newField,
                                                options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                            })
                                        }
                                        className="input"
                                        placeholder="Option 1, Option 2, Option 3"
                                    />
                                </div>
                            )}

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={newField.required}
                                    onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                                    className="w-5 h-5 rounded border-surface-300 text-primary-500"
                                />
                                <span className="text-surface-700">This field is required</span>
                            </label>

                            <div className="flex items-center gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="btn-primary flex-1">
                                    {saving ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Plus className="w-5 h-5 mr-2" />
                                            Add Field
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
