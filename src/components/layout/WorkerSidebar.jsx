import { createElement, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, ClipboardCheck, ListChecks, LogOut, X } from "lucide-react";
import { authService } from "@/services/authService";
import { getStoredUser } from "@/lib/authStorage";
import { hasAnyRole } from "@/lib/internalRoleFlow";
import "@/styles/dashboard-sidebar.css";

const WORKER_NAV_ITEMS = [
  { to: "/worker/production-plan", label: "Kế hoạch sản xuất", icon: ListChecks },
  { to: "/worker/output-history", label: "Lịch sử sản lượng", icon: ClipboardCheck },
  { to: "/worker/leave-requests", label: "Xin nghỉ phép", icon: CalendarDays },
];

function getInitials(name = "") {
  return name
    .split(" ")
    .map((item) => item[0])
    .filter(Boolean)
    .slice(-2)
    .join("")
    .toUpperCase();
}

export default function WorkerSidebar({ mobileOpen = false, onClose = () => {} }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 768;
  });
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const raw = localStorage.getItem("gpms-worker-sidebar-collapsed");
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  });

  const user = getStoredUser();
  const effectiveCollapsed = collapsed && !isMobileViewport;
  const navItems = WORKER_NAV_ITEMS;
  const roleValue = user?.role ?? user?.roles ?? user?.roleName ?? "";
  const brandSubtitle = hasAnyRole(roleValue, ["Owner", "Admin"]) ? "Tổng quan" : (hasAnyRole(roleValue, ["PM", "Manager"]) ? "Quản lý" : "Nhân viên");
  const defaultName = "Nhân viên";
  const roleLabel = roleValue || "Worker";

  useEffect(() => {
    try {
      localStorage.setItem("gpms-worker-sidebar-collapsed", JSON.stringify(collapsed));
    } catch {
      // ignore storage errors
    }
  }, [collapsed]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      setIsMobileViewport(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  return (
    <>
      <div
        className={`dashboard-sidebar__overlay ${mobileOpen ? "is-visible" : ""}`}
        onClick={onClose}
        aria-hidden={!mobileOpen}
      />

      <aside
        className={`dashboard-sidebar ${effectiveCollapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`}
        aria-expanded={isMobileViewport ? mobileOpen : !effectiveCollapsed}
      >
      <div className="dashboard-sidebar__brand">
        <button
          type="button"
          className="dashboard-sidebar__logo"
          onClick={() => {
            if (isMobileViewport) return;
            setCollapsed((prev) => !prev);
          }}
          title={isMobileViewport ? "GPMS" : collapsed ? "Mở sidebar" : "Thu gọn sidebar"}
        >
          <span className="dashboard-sidebar__logo-mark">GP</span>
        </button>

        {!effectiveCollapsed && (
          <div className="dashboard-sidebar__brand-text">
            <div className="dashboard-sidebar__brand-title">GPMS</div>
            <div className="dashboard-sidebar__brand-subtitle">{brandSubtitle}</div>
          </div>
        )}

        <button
          type="button"
          className="dashboard-sidebar__mobile-close"
          onClick={onClose}
          aria-label="Đóng menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="dashboard-sidebar__nav">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => {
              const currentPath = location.pathname;
              let isCategoryActive = isActive;

              // Đặc biệt cho thợ: Các trang báo cáo và sổ cắt thuộc về Kế hoạch sản xuất
              if (to === "/worker/production-plan") {
                isCategoryActive = isActive || 
                  currentPath.startsWith("/worker/error-report") || 
                  currentPath.startsWith("/worker/daily-report") ||
                  currentPath.startsWith("/worker/cutting-book") ||
                  currentPath.startsWith("/worker/production-plan");
              }
              
              if (to === "/worker/output-history") {
                isCategoryActive = isActive || currentPath.startsWith("/worker/output-history");
              }

              if (to === "/worker/leave-requests") {
                isCategoryActive = isActive || currentPath.startsWith("/worker/leave-requests");
              }

              return `dashboard-sidebar__item ${isCategoryActive ? "is-active" : ""}`;
            }}
            title={label}
            onClick={onClose}
          >
            {createElement(Icon, { size: 22 })}
            {!effectiveCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="dashboard-sidebar__footer">
        <NavLink
          to="/profile"
          title="Hồ sơ cá nhân"
          onClick={onClose}
          className={({ isActive }) => `dashboard-sidebar__account ${isActive ? "is-active" : ""}`}
        >
          <div className="dashboard-sidebar__avatar">
            {getInitials(user?.fullName || user?.name || "NV")}
          </div>
          {!effectiveCollapsed && (
            <div className="dashboard-sidebar__user">
              <div className="dashboard-sidebar__user-name">{user?.fullName || user?.name || defaultName}</div>
            </div>
          )}
        </NavLink>

        <button
          type="button"
          className="dashboard-sidebar__logout"
          onClick={handleLogout}
          title="Đăng xuất"
        >
          <LogOut size={18} />
          {!effectiveCollapsed && <span>Đăng xuất</span>}
        </button>
      </div>
      </aside>
    </>
  );
}
