import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Wallet, Settings } from 'lucide-react';
import clsx from 'clsx';

const Layout: React.FC = () => {
    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/transactions', icon: Receipt, label: 'Transactions' },
        { to: '/accounts', icon: Wallet, label: 'Accounts' },
        { to: '/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <main className="flex-1 pb-20 md:pb-0 md:pl-64">
                <div className="max-w-7xl mx-auto p-4 md:p-8">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around items-center z-50">
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            clsx(
                                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                                isActive ? "text-blue-600 bg-blue-50" : "text-gray-500 hover:text-gray-900"
                            )
                        }
                    >
                        <Icon size={24} />
                        <span className="text-xs font-medium">{label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-gray-200 flex-col">
                <div className="p-6 border-b border-gray-200">
                    <h1 className="text-2xl font-bold text-gray-900">One Piece</h1>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                clsx(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                    isActive ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                )
                            }
                        >
                            <Icon size={20} />
                            <span className="font-medium">{label}</span>
                        </NavLink>
                    ))}
                </nav>
            </aside>
        </div>
    );
};

export default Layout;
