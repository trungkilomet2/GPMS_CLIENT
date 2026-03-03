// src/components/layout/Sidebar.jsx
import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ShoppingCart, Activity, Menu } from 'lucide-react';

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(() => {
        try {
            const raw = localStorage.getItem('gpms-sidebar-collapsed');
            return raw ? JSON.parse(raw) : false;
        } catch {
            return false;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('gpms-sidebar-collapsed', JSON.stringify(collapsed));
        } catch { }
    }, [collapsed]);

    const asideRef = useRef(null);

    return (
        <aside
            ref={asideRef}
            className={`flex flex-col h-screen transition-all duration-200 ease-in-out
        ${collapsed ? 'w-16' : 'w-64'}`}
            aria-expanded={!collapsed}
        >
            <div
                className={`flex flex-col h-full
          backdrop-blur-sm
          bg-white/30 dark:bg-black/30
          border-r border-white/10 dark:border-black/10
          shadow-sm`}
            >
                {/* Header: click logo to toggle */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div
                            onClick={() => setCollapsed(v => !v)}
                            role="button"
                            aria-pressed={collapsed}
                            title={collapsed ? 'Mở sidebar' : 'Thu gọn sidebar'}
                            className={`cursor-pointer flex items-center justify-center text-white font-bold rounded-lg
                ${collapsed ? 'w-10 h-10 bg-emerald-600' : 'w-10 h-10 bg-emerald-600'}`}
                        >
                            GP
                        </div>

                        <div className={`${collapsed ? 'hidden' : 'block'}`}>
                            <h1 className="font-bold text-lg text-gray-900 dark:text-white">GPMS</h1>
                            <p className="text-xs text-gray-600 dark:text-gray-300">Quản lý sản xuất</p>
                        </div>
                    </div>

                    {/* Removed chevrons button as requested; keep a small placeholder for spacing on wide view */}
                    <div className={`${collapsed ? 'hidden' : 'block'}`} aria-hidden="true" />
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-2 py-4">
                    <ul className="space-y-1">
                        <li>
                            <NavLink
                                to="/dashboard"
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150
                   ${isActive ? 'bg-emerald-100/20 text-emerald-800 font-medium' : 'text-gray-700 hover:bg-white/5 dark:text-gray-200'}`
                                }
                                title="Dashboard"
                            >
                                <Home size={18} />
                                <span className={`${collapsed ? 'sr-only' : ''}`}>Dashboard</span>
                            </NavLink>
                        </li>

                        <li>
                            <NavLink
                                to="/orders"
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150
                   ${isActive ? 'bg-orange-100/20 text-orange-800 font-medium' : 'text-gray-700 hover:bg-white/5 dark:text-gray-200'}`
                                }
                                title="Danh sách đơn hàng"
                            >
                                <ShoppingCart size={18} />
                                <span className={`${collapsed ? 'sr-only' : ''}`}>Danh sách đơn hàng</span>
                            </NavLink>
                        </li>

                        <li>
                            <NavLink
                                to="/monitoring"
                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-white/5 transition-colors duration-150 dark:text-gray-200"
                                title="Giám sát hoạt động"
                            >
                                <Activity size={18} />
                                <span className={`${collapsed ? 'sr-only' : ''}`}>Giám sát hoạt động</span>
                            </NavLink>
                        </li>
                    </ul>
                </nav>

                {/* Footer / profile */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-300/80 flex items-center justify-center text-gray-800">👤</div>
                        <div className={`${collapsed ? 'hidden' : 'block'}`}>
                            <p className="font-medium text-gray-900 dark:text-white">Nguyễn Văn An</p>
                            <p className="text-xs text-gray-500 dark:text-gray-300">Khách hàng</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}