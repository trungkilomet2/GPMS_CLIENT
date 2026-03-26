import { createElement, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AlertTriangle, CalendarDays, ClipboardCheck, ListChecks, LogOut } from "lucide-react";
import { authService } from "@/services/authService";
import { getStoredUser } from "@/lib/authStorage";
import { hasAnyRole } from "@/lib/internalRoleFlow";
import "@/styles/dashboard-sidebar.css";

const WORKER_NAV_ITEMS = [
  { to: "/worker/production-plan", label: "Kế hoạch sản xuất", icon: ListChecks },
  { to: "/worker/output-history", label: "Lịch sử sản lượng", icon: ClipboardCheck },
  { to: "/worker/error-report", label: "Báo lỗi", icon: AlertTriangle },
  { to: "/worker/leave-requests", label: "Xin nghỉ phép", icon: CalendarDays },
];

const KCS_NAV_ITEMS = [
  { to: "/worker/production-plan", label: "Kế hoạch sản xuất", icon: ListChecks },
  { to: "/worker/output-history", label: "Lịch sử sản lượng", icon: ClipboardCheck },
  { to: "/worker/error-report", label: "Kiểm lỗi KCS", icon: AlertTriangle },
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

export default function WorkerSidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const raw = localStorage.getItem("gpms-worker-sidebar-collapsed");
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  });

  const user = getStoredUser();
  const isKcsUser = hasAnyRole(user?.role, ["kcs", "quality control", "qc"]);
  const navItems = isKcsUser ? KCS_NAV_ITEMS : WORKER_NAV_ITEMS;
  const brandSubtitle = isKcsUser ? "KCS" : "Nhân viên";
  const defaultName = isKcsUser ? "KCS" : "Nhân viên";
  const roleLabel = isKcsUser ? "Worker / KCS" : "Worker";

  useEffect(() => {
    try {
      localStorage.setItem("gpms-worker-sidebar-collapsed", JSON.stringify(collapsed));
    } catch {
      // ignore storage errors
    }
  }, [collapsed]);

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  return (
    <aside className={`dashboard-sidebar ${collapsed ? "is-collapsed" : ""}`} aria-expanded={!collapsed}>
      <div className="dashboard-sidebar__brand">
        <button
          type="button"
          className="dashboard-sidebar__logo"
          onClick={() => setCollapsed((prev) => !prev)}
          title={collapsed ? "Mở sidebar" : "Thu gọn sidebar"}
        >
          <span className="dashboard-sidebar__logo-mark">GP</span>
        </button>

        {!collapsed && (
          <div className="dashboard-sidebar__brand-text">
            <div className="dashboard-sidebar__brand-title">GPMS</div>
            <div className="dashboard-sidebar__brand-subtitle">{brandSubtitle}</div>
          </div>
        )}
      </div>

      <nav className="dashboard-sidebar__nav">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) => `dashboard-sidebar__item ${isActive ? "is-active" : ""}`}
          >
            {createElement(Icon, { size: 22 })}
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="dashboard-sidebar__footer">
        <NavLink
          to="/profile"
          title="Hồ sơ cá nhân"
          className={({ isActive }) => `dashboard-sidebar__account ${isActive ? "is-active" : ""}`}
        >
          <div className="dashboard-sidebar__avatar">
            {getInitials(user?.fullName || user?.name || "NV")}
          </div>
          {!collapsed && (
            <div className="dashboard-sidebar__user">
              <div className="dashboard-sidebar__user-name">{user?.fullName || user?.name || defaultName}</div>
              <div className="dashboard-sidebar__user-role">{roleLabel}</div>
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
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
}
