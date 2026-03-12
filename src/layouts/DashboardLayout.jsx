<<<<<<< HEAD
import Sidebar from "@/components/layout/SideBar";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#c5dbbf]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
=======
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
>>>>>>> develop
}
