// src/layouts/DashboardLayout.jsx
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }) {
    return (
        <div className="flex h-screen bg-gray-50">
            <div className="bg-green-300">
                <Sidebar />
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}