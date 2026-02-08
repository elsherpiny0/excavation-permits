import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    LayoutDashboard,
    FileText,
    Settings,
    Users,
    LogOut,
    HardHat,
    ChevronRight,
    Sliders,
} from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'New Permit', href: '/permits/new', icon: FileText },
];

const adminNavigation = [
    { name: 'Schema Editor', href: '/settings/schema', icon: Settings },
    { name: 'User Management', href: '/settings/users', icon: Users },
    { name: 'App Settings', href: '/settings/app', icon: Sliders },
];

export default function Sidebar() {
    const location = useLocation();
    const { profile, signOut } = useAuth();

    const isActive = (href) => {
        if (href === '/') return location.pathname === '/';
        return location.pathname.startsWith(href);
    };

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-surface-100 flex flex-col z-40">
            {/* Logo */}
            <div className="p-6 border-b border-surface-100">
                <Link to="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                        <HardHat className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-surface-900">Excavation</h1>
                        <p className="text-xs text-surface-500">Permit System</p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <p className="px-4 py-2 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                    Main
                </p>
                {navigation.map((item) => (
                    <Link
                        key={item.name}
                        to={item.href}
                        className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
                    >
                        <item.icon className="w-5 h-5" />
                        <span>{item.name}</span>
                        {isActive(item.href) && (
                            <ChevronRight className="w-4 h-4 ml-auto" />
                        )}
                    </Link>
                ))}

                {profile?.role === 'super_admin' && (
                    <>
                        <p className="px-4 py-2 mt-6 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                            Administration
                        </p>
                        {adminNavigation.map((item) => (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
                            >
                                <item.icon className="w-5 h-5" />
                                <span>{item.name}</span>
                                {isActive(item.href) && (
                                    <ChevronRight className="w-4 h-4 ml-auto" />
                                )}
                            </Link>
                        ))}
                    </>
                )}
            </nav>

            {/* User section */}
            <div className="p-4 border-t border-surface-100">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-50">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                        {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-900 truncate">
                            {profile?.full_name || 'User'}
                        </p>
                        <p className="text-xs text-surface-500 truncate">
                            {profile?.role === 'super_admin' ? 'Super Admin' : 'Staff'}
                        </p>
                    </div>
                    <button
                        onClick={signOut}
                        className="p-2 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Sign out"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
