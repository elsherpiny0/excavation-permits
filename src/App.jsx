import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthForm from './components/auth/AuthForm';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import PermitForm from './components/permits/PermitForm';
import PermitDetail from './pages/PermitDetail';
import SchemaEditor from './pages/SchemaEditor';
import UserManagement from './pages/UserManagement';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-50">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto mb-4" />
                    <p className="text-surface-500">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function PublicRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-900">
                <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
            </div>
        );
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    return children;
}

function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <AuthForm />
                    </PublicRoute>
                }
            />

            {/* Protected Routes */}
            <Route
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >
                <Route path="/" element={<Dashboard />} />
                <Route path="/permits/new" element={<PermitForm />} />
                <Route path="/permits/:id" element={<PermitDetail />} />
                <Route path="/permits/:id/edit" element={<PermitForm />} />
                <Route path="/settings/schema" element={<SchemaEditor />} />
                <Route path="/settings/users" element={<UserManagement />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: '#1e293b',
                            color: '#f8fafc',
                            borderRadius: '12px',
                            padding: '16px',
                        },
                        success: {
                            iconTheme: {
                                primary: '#10b981',
                                secondary: '#f8fafc',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: '#ef4444',
                                secondary: '#f8fafc',
                            },
                        },
                    }}
                />
            </AuthProvider>
        </BrowserRouter>
    );
}
