// src/layouts/DashboardLayout.jsx
import Sidebar from '@/components/layout/Sidebar';
import '@/styles/homepage.css';

export default function DashboardLayout({ children }) {
    return (
        <div
            className="flex"
            style={{
                minHeight: "100vh",
                alignItems: "stretch",
                background: "var(--sand)",
                fontFamily: "'Lexend','Be Vietnam Pro','Segoe UI',sans-serif",
            }}
        >
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
