import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import WorkerSidebar from "@/components/layout/WorkerSidebar";

export default function WorkerLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="dashboard-layout">
      <WorkerSidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="dashboard-layout__content">
        <div className="dashboard-layout__mobile-bar">
          <button
            type="button"
            className="dashboard-layout__mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Mở menu điều hướng"
          >
            <Menu size={20} />
          </button>
          <div className="dashboard-layout__mobile-brand">
            <strong>GPMS</strong>
            <span>Nhân viên</span>
          </div>
        </div>

        <main className="dashboard-layout__main">{children}</main>
      </div>
    </div>
  );
}
