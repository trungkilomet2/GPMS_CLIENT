import { useEffect, useState } from "react";
import { createElement } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  CalendarDays,
  ChartPie,
  ClipboardCheck,
  ClipboardList,
  ListChecks,
  LogOut,
  ContactRound,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { authService } from "@/services/authService";
import { getStoredUser } from "@/lib/authStorage";
import { canManageLeaveRequests } from "@/lib/roleAccess";
import { getPrimaryWorkspaceRole, hasAnyRole, splitRoles } from "@/lib/internalRoleFlow";
import { getSystemRoleLabel } from "@/lib/orgHierarchy";
import "@/styles/dashboard-sidebar.css";

const ADMIN_NAV_ITEMS = [
  { to: "/admin/users", label: "Quản lý tài khoản", icon: Users, disabled: false },
  { to: "/admin/logs", label: "Nhật ký hệ thống", icon: ClipboardList, disabled: false },
  { to: "/admin/permissions", label: "Phân quyền", icon: ShieldCheck, disabled: false },
];

const OPERATION_NAV_ITEMS = [
  { to: "/dashboard", label: "Bảng điều khiển", icon: ChartPie, disabled: false, allowedRoles: ["Owner"] },
  { to: "/orders/owner", label: "Danh sách đơn hàng", icon: BriefcaseBusiness, disabled: false, allowedRoles: ["Owner"] },
  { to: "/production", label: "Quản lý sản xuất", icon: ClipboardList, disabled: false, allowedRoles: ["Owner", "PM"] },
  { to: "/worker/output-history", label: "Lịch sử sản lượng", icon: ClipboardCheck, disabled: false, allowedRoles: ["Owner", "PM"] },
  { to: "/employees", label: "Danh sách nhân viên", icon: Users, disabled: false, compactLabel: true, allowedRoles: ["Owner", "PM"] },
  { to: "/customers", label: "Khách hàng", icon: ContactRound, disabled: false, allowedRoles: ["Owner"] },
  { to: "/payroll", label: "Bảng lương thợ", icon: Wallet, disabled: false, allowedRoles: ["Owner"] },
  { to: "/leave-requests", label: "Đơn nghỉ của tôi", icon: CalendarDays, disabled: false, allowedRoles: ["PM"] },
  { to: "/leave", label: "Quản lý nghỉ phép", icon: ClipboardList, disabled: false, allowedRoles: ["Owner", "PM"] },
];

function hasRequiredRole(user, allowedRoles) {
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return true;
  return hasAnyRole(user?.role, allowedRoles);
}

function resolveSidebarItems(user) {
  const primaryRole = getPrimaryWorkspaceRole(user?.role);

  if (primaryRole === "admin") {
    return ADMIN_NAV_ITEMS;
  }

  if (primaryRole === "owner" || primaryRole === "pm") {
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

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 768;
  });
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const raw = localStorage.getItem("gpms-sidebar-collapsed");
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  });

  const user = getStoredUser();
  const effectiveCollapsed = collapsed && !isMobileViewport;
  const navItems = resolveSidebarItems(user).filter((item) => {
    if (item.to === "/leave") {
      return canManageLeaveRequests(user?.role);
    }

    return true;
  });
  const isOrdersSection = location.pathname.startsWith("/orders");
  const isProductionSection = location.pathname.startsWith("/production") || location.pathname.includes("/cutting-book");
  const userRoleLabel = splitRoles(user?.role)
    .map((role) => getSystemRoleLabel(role))
    .join(", ");

  useEffect(() => {
    try {
      localStorage.setItem("gpms-sidebar-collapsed", JSON.stringify(collapsed));
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
            <div className="dashboard-sidebar__brand-subtitle">Quản lý sản xuất</div>
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
        {navItems.map(({ to, label, icon: Icon, disabled, compactLabel, allowedRoles }) => {
          if (!hasRequiredRole(user, allowedRoles)) return null;

          if (disabled) {
            return (
              <div
                key={to}
                className={`dashboard-sidebar__item is-disabled ${compactLabel ? "dashboard-sidebar__item--compact" : ""}`}
                title={label}
              >
                {createElement(Icon, { size: 22 })}
                {!effectiveCollapsed && <span>{label}</span>}
              </div>
            );
          }

          return (
            <NavLink
              key={to}
              to={to}
              title={label}
              onClick={onClose}
              className={({ isActive }) => {
                const isForcedActive = (to === "/orders/owner" && isOrdersSection) || (to === "/production" && isProductionSection);
                const active = isActive || isForcedActive;
                return `dashboard-sidebar__item ${compactLabel ? "dashboard-sidebar__item--compact" : ""} ${active ? "is-active" : ""}`;
              }}
            >
              {createElement(Icon, { size: 22 })}
              {!effectiveCollapsed && <span>{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="dashboard-sidebar__footer">
        <NavLink
          to="/profile"
          title="Hồ sơ cá nhân"
          onClick={onClose}
          className={({ isActive }) => `dashboard-sidebar__account ${isActive ? "is-active" : ""}`}
        >
          <div className="dashboard-sidebar__avatar">
            {getInitials(user?.fullName || user?.name || "GP")}
          </div>
          {!effectiveCollapsed && (
            <div className="dashboard-sidebar__user">
              <div className="dashboard-sidebar__user-name">{user?.fullName || user?.name || "Người dùng"}</div>
              <div className="dashboard-sidebar__user-role">{userRoleLabel || "Chủ xưởng / Quản lý sản xuất"}</div>
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
