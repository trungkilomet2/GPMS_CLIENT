import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  ChartPie,
  ClipboardList,
  LogOut,
  Users,
} from "lucide-react";
import { authService } from "@/services/authService";
import { getStoredUser } from "@/lib/authStorage";
import { canManageLeaveRequests } from "@/lib/roleAccess";
import "@/styles/dashboard-sidebar.css";

const NAV_ITEMS = [
  { key: "dashboard", to: "/home", label: "Dashboard", icon: ChartPie, disabled: false },
  { key: "orders", to: "/orders/owner", label: "Danh sách đơn hàng", icon: BriefcaseBusiness, disabled: false },
  { key: "monitoring", to: "/monitoring", label: "Giám sát hoạt động", icon: ClipboardList, disabled: true },
  { key: "employees", to: "/employees", label: "Danh sách nhân viên", icon: Users, disabled: true },
  { key: "leave", to: "/leave", label: "Quản lý nghỉ phép", icon: ClipboardList, disabled: false },
  { key: "salary", to: "/salary", label: "Bảng lương", icon: BadgeDollarSign, disabled: true },
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

export default function Sidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const raw = localStorage.getItem("gpms-sidebar-collapsed");
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  });

  const user = getStoredUser();
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.key === "leave") {
      return canManageLeaveRequests(user?.role);
    }

    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem("gpms-sidebar-collapsed", JSON.stringify(collapsed));
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
            <div className="dashboard-sidebar__brand-subtitle">Quản lý sản xuất</div>
          </div>
        )}
      </div>

      <nav className="dashboard-sidebar__nav">
        {visibleNavItems.map(({ to, label, icon: Icon, disabled }) => {
          if (disabled) {
            return (
              <div key={label} className="dashboard-sidebar__item is-disabled" title={label}>
                <Icon size={22} />
                {!collapsed && <span>{label}</span>}
              </div>
            );
          }

          return (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) => `dashboard-sidebar__item ${isActive ? "is-active" : ""}`}
            >
              <Icon size={22} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="dashboard-sidebar__footer">
        <div className="dashboard-sidebar__account">
          <div className="dashboard-sidebar__avatar">
            {getInitials(user?.fullName || user?.name || "GP")}
          </div>
          {!collapsed && (
            <div className="dashboard-sidebar__user">
              <div className="dashboard-sidebar__user-name">{user?.fullName || user?.name || "Người dùng"}</div>
              <div className="dashboard-sidebar__user-role">{user?.role || "Owner / PM"}</div>
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
