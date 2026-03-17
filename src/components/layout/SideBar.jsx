﻿import { useEffect, useState } from "react";
import { createElement } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  ChartPie,
  ClipboardList,
  ListChecks,
  LogOut,
  ShieldCheck,
  Users,
} from "lucide-react";
import { authService } from "@/services/authService";
import { getStoredUser } from "@/lib/authStorage";
import { canManageLeaveRequests } from "@/lib/roleAccess";
import "@/styles/dashboard-sidebar.css";

const ADMIN_NAV_ITEMS = [
  { to: "/admin/users", label: "Quản lý user", icon: Users, disabled: false },
  { to: "/admin/logs", label: "System log", icon: ClipboardList, disabled: false },
  { to: "/admin/permissions", label: "Phân quyền", icon: ShieldCheck, disabled: false },
];

const OPERATION_NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: ChartPie, disabled: false },
  { to: "/orders/owner", label: "Danh sách đơn hàng", icon: BriefcaseBusiness, disabled: false },
  { to: "/production", label: "Danh sách sản xuất", icon: ClipboardList, disabled: false },
  { to: "/production-plan", label: "Kế hoạch sản xuất", icon: ListChecks, disabled: false, requiredRole: "Owner" },
  { to: "/employees", label: "Danh sách nhân viên", icon: Users, disabled: false, compactLabel: true, requiredRole: "Owner" },
  { to: "/leave", label: "Quản lý nghỉ phép", icon: ClipboardList, disabled: false },
  { to: "/salary", label: "Bảng lương", icon: BadgeDollarSign, disabled: false, requiredRole: "Owner" },
];

function splitRoles(value) {
  const normalizeRoleItem = (item) => {
    if (item == null) return "";
    if (typeof item === "string" || typeof item === "number") return String(item).trim();
    if (typeof item === "object") return String(item.name ?? item.role ?? item.roleName ?? item.value ?? item.label ?? "").trim();
    return "";
  };

  if (Array.isArray(value)) return value.map(normalizeRoleItem).filter(Boolean);

  if (value && typeof value === "object") {
    const normalized = normalizeRoleItem(value);
    return normalized ? [normalized] : [];
  }

  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasRequiredRole(user, requiredRole) {
  if (!requiredRole) return true;
  const roles = splitRoles(user?.role);
  return roles.includes(requiredRole);
}

function resolveSidebarItems(user) {
  const roles = splitRoles(user?.role);

  if (roles.includes("Admin")) {
    return ADMIN_NAV_ITEMS;
  }

  if (roles.includes("Owner") || roles.includes("PM")) {
    return OPERATION_NAV_ITEMS;
  }

  return [];
}

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
  const navItems = resolveSidebarItems(user).filter((item) => {
    if (item.to === "/leave") {
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
        {navItems.map(({ to, label, icon: Icon, disabled, compactLabel, requiredRole }) => {
          if (!hasRequiredRole(user, requiredRole)) return null;

          if (disabled) {
            return (
              <div
                key={to}
                className={`dashboard-sidebar__item is-disabled ${compactLabel ? "dashboard-sidebar__item--compact" : ""}`}
                title={label}
              >
                {createElement(Icon, { size: 22 })}
                {!collapsed && <span>{label}</span>}
              </div>
            );
          }

          return (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                `dashboard-sidebar__item ${compactLabel ? "dashboard-sidebar__item--compact" : ""} ${isActive ? "is-active" : ""}`
              }
            >
              {createElement(Icon, { size: 22 })}
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
