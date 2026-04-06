import { createElement, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ClipboardList, ClipboardCheck, LogOut, Users, X } from "lucide-react";
import { authService } from "@/services/authService";
import { getStoredUser } from "@/lib/authStorage";
import "@/styles/dashboard-sidebar.css";

const NAV_ITEMS = [
  { to: "/production-plan", label: "Kế hoạch sản xuất", icon: ClipboardList },
  { to: "/production-plan/assign", label: "Phân công thợ", icon: Users },
  { to: "/output-history", label: "Lịch sử sản lượng", icon: ClipboardList },
  { to: "/leave-requests", label: "Đơn nghỉ phép", icon: ClipboardCheck },
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

export default function TeamLeaderSidebar({ mobileOpen = false, onClose = () => {} }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 768;
  });
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const raw = localStorage.getItem("gpms-tl-sidebar-collapsed");
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  });

  const user = getStoredUser();
  const effectiveCollapsed = collapsed && !isMobileViewport;

  useEffect(() => {
    try {
      localStorage.setItem("gpms-tl-sidebar-collapsed", JSON.stringify(collapsed));
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
            <div className="dashboard-sidebar__brand-subtitle">Tổ trưởng</div>
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
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => {
              const currentPath = location.pathname;
              let isCategoryActive = isActive;
              
              if (to === "/production-plan") {
                isCategoryActive = isActive || currentPath.startsWith("/production-plan");
              }

              if (to === "/output-history") {
                isCategoryActive = isActive || currentPath.startsWith("/output-history");
              }

              if (to === "/leave-requests") {
                isCategoryActive = isActive || currentPath.startsWith("/leave-requests");
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
            {getInitials(user?.fullName || user?.name || "TL")}
          </div>
          {!effectiveCollapsed && (
            <div className="dashboard-sidebar__user">
              <div className="dashboard-sidebar__user-name">{user?.fullName || user?.name || "Tổ trưởng"}</div>
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
