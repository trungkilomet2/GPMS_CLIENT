import { createElement, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, CalendarDays, ClipboardCheck, ListChecks, LogOut } from "lucide-react";
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

export default function WorkerSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const raw = localStorage.getItem("gpms-worker-sidebar-collapsed");
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  });

  const user = getStoredUser();
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
