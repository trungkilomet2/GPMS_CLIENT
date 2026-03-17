import { createElement, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ClipboardList, ClipboardCheck, LogOut } from "lucide-react";
import { authService } from "@/services/authService";
import { getStoredUser } from "@/lib/authStorage";
import "@/styles/dashboard-sidebar.css";

const NAV_ITEMS = [
  { to: "/production-plan/assign", label: "Phân công công việc", icon: ClipboardCheck },
  { to: "/production-plan", label: "Kế hoạch sản xuất", icon: ClipboardList },
  { to: "/output-history", label: "Lịch sử sản lượng", icon: ClipboardList },
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

export default function TeamLeaderSidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const raw = localStorage.getItem("gpms-tl-sidebar-collapsed");
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  });

  const user = getStoredUser();

  useEffect(() => {
    try {
      localStorage.setItem("gpms-tl-sidebar-collapsed", JSON.stringify(collapsed));
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
            <div className="dashboard-sidebar__brand-subtitle">Tổ trưởng</div>
          </div>
        )}
      </div>

      <nav className="dashboard-sidebar__nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
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
        <div className="dashboard-sidebar__account">
          <div className="dashboard-sidebar__avatar">
            {getInitials(user?.fullName || user?.name || "TL")}
          </div>
          {!collapsed && (
            <div className="dashboard-sidebar__user">
              <div className="dashboard-sidebar__user-name">{user?.fullName || user?.name || "Tổ trưởng"}</div>
              <div className="dashboard-sidebar__user-role">Team Leader</div>
            </div>
          )}
        </div>

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
