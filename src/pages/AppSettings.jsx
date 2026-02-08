import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Settings, Loader2, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AppSettings() {
    const { isSuperAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [registrationEnabled, setRegistrationEnabled] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('*');

            if (error) throw error;

            const regSetting = data?.find(s => s.key === 'registration_enabled');
            if (regSetting) {
                setRegistrationEnabled(regSetting.value === true || regSetting.value === 'true');
            }
        } catch (error) {
            toast.error('فشل في تحميل الإعدادات');
        } finally {
            setLoading(false);
        }
    }

    async function handleToggleRegistration() {
        setSaving(true);
        const newValue = !registrationEnabled;

        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({
                    key: 'registration_enabled',
                    value: newValue,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            setRegistrationEnabled(newValue);
            toast.success(newValue ? 'تم تفعيل التسجيل' : 'تم إيقاف التسجيل');
        } catch (error) {
            toast.error('فشل في حفظ الإعداد');
        } finally {
            setSaving(false);
        }
    }

    if (!isSuperAdmin) {
        return <Navigate to="/" replace />;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto animate-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-surface-900 flex items-center gap-3">
                    <Settings className="w-8 h-8 text-primary-500" />
                    إعدادات التطبيق
                </h1>
                <p className="text-surface-500 mt-1">
                    إدارة إعدادات النظام
                </p>
            </div>

            {/* Settings Cards */}
            <div className="space-y-4">
                {/* Registration Toggle */}
                <div className="card p-6" dir="rtl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                                <Shield className="w-6 h-6 text-primary-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-surface-900">التسجيل العام</h3>
                                <p className="text-sm text-surface-500">
                                    السماح للمستخدمين بإنشاء حسابات جديدة
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleToggleRegistration}
                            disabled={saving}
                            className={`p-2 rounded-lg transition-colors ${registrationEnabled
                                    ? 'text-green-600 hover:bg-green-50'
                                    : 'text-surface-400 hover:bg-surface-50'
                                }`}
                        >
                            {saving ? (
                                <Loader2 className="w-8 h-8 animate-spin" />
                            ) : registrationEnabled ? (
                                <ToggleRight className="w-10 h-10" />
                            ) : (
                                <ToggleLeft className="w-10 h-10" />
                            )}
                        </button>
                    </div>
                    <div className={`mt-4 px-4 py-2 rounded-lg text-sm ${registrationEnabled
                            ? 'bg-green-50 text-green-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                        {registrationEnabled
                            ? '✓ التسجيل مفعل - يمكن للمستخدمين إنشاء حسابات جديدة'
                            : '⚠ التسجيل معطل - فقط الأدمن يمكنه إنشاء حسابات جديدة'
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}
