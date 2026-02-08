import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, User, ArrowRight, Loader2, HardHat } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthForm() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [registrationEnabled, setRegistrationEnabled] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
    });

    const { signIn, signUp } = useAuth();

    useEffect(() => {
        checkRegistrationSetting();
    }, []);

    async function checkRegistrationSetting() {
        const { data } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'registration_enabled')
            .single();
        if (data) {
            setRegistrationEnabled(data.value === true || data.value === 'true');
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                const { error } = await signIn({
                    email: formData.email,
                    password: formData.password,
                });
                if (error) throw error;
                toast.success('Welcome back!');
            } else {
                const { error } = await signUp({
                    email: formData.email,
                    password: formData.password,
                    fullName: formData.fullName,
                });
                if (error) throw error;
                toast.success('Account created! Please check your email to verify.');
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-900 via-surface-800 to-primary-900 px-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-600/20 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative animate-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-glow mb-4">
                        <HardHat className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Excavation Permits
                    </h1>
                    <p className="text-surface-400">
                        {isLogin ? 'Sign in to manage permits' : 'Create your account'}
                    </p>
                </div>

                {/* Form Card */}
                <div className="card-glass p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!isLogin && (
                            <div className="animate-in">
                                <label htmlFor="fullName" className="label text-white/80">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                                    <input
                                        id="fullName"
                                        name="fullName"
                                        type="text"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        className="input pl-12 bg-white/10 border-white/20 text-white placeholder-white/40 focus:bg-white/20"
                                        placeholder="John Doe"
                                        required={!isLogin}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="label text-white/80">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="input pl-12 bg-white/10 border-white/20 text-white placeholder-white/40 focus:bg-white/20"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="label text-white/80">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input pl-12 bg-white/10 border-white/20 text-white placeholder-white/40 focus:bg-white/20"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full text-lg py-3"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </button>
                    </form>

                    {registrationEnabled && (
                        <div className="mt-6 text-center">
                            <button
                                type="button"
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-primary-300 hover:text-primary-200 font-medium transition-colors"
                            >
                                {isLogin
                                    ? "Don't have an account? Sign up"
                                    : 'Already have an account? Sign in'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
