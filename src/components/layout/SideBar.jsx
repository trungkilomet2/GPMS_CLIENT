<<<<<<< HEAD
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
import "@/styles/dashboard-sidebar.css";

const NAV_ITEMS = [
  { to: "/home", label: "Dashboard", icon: ChartPie, exact: false, disabled: false },
  { to: "/orders/owner", label: "Danh sách đơn hàng", icon: BriefcaseBusiness, exact: false, disabled: false },
  { to: "/monitoring", label: "Giám sát hoạt động", icon: ClipboardList, exact: false, disabled: true },
  { to: "/employees", label: "Danh sách nhân viên", icon: Users, exact: false, disabled: true },
  { to: "/leave", label: "Quản lý nghỉ phép", icon: ClipboardList, exact: true, disabled: false },
  { to: "/salary", label: "Bảng lương", icon: BadgeDollarSign, exact: false, disabled: true },
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
=======
// src/components/layout/Sidebar.jsx
import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ShoppingCart, History, FileText, Edit3, LogOut } from 'lucide-react';
import { clearAuthStorage, getStoredUser } from '@/lib/authStorage';
import '@/styles/homepage.css';

const SIDEBAR_CSS = `
  .osb-item:hover {
    background: var(--green-light);
    color: var(--green-mid);
  }
  .osb-item:hover svg { stroke: var(--green-mid); }
  .osb-logout:hover {
    background: #fef2f2;
    color: #dc2626;
  }
  .osb-logout:hover svg { stroke: #dc2626; }
`;

const NAV_ITEMS = [
    { to: "/orders/manual-create", label: "Tạo đơn thủ công", icon: <Edit3 size={18} />, end: true },
    { to: "/orders/owner", label: "Danh sách đơn hàng", icon: <ShoppingCart size={18} />, end: true },
    //{ to: "/orders", label: "Lịch sử tạo đơn", icon: <History size={18} />, end: true },
    { to: "/leave-requests", label: "Đơn xin nghỉ phép", icon: <FileText size={18} />, end: true },

];

export default function Sidebar() {
    const navigate = useNavigate();
    const user = getStoredUser();
    const userName = user?.fullName || user?.name || user?.userName || "Owner";

    const [collapsed, setCollapsed] = useState(() => {
        try {
            const raw = localStorage.getItem('gpms-sidebar-collapsed');
            return raw ? JSON.parse(raw) : false;
        } catch {
            return false;
        }
    });
>>>>>>> develop

  const user = getStoredUser();

<<<<<<< HEAD
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
        {NAV_ITEMS.map(({ to, label, icon: Icon, disabled }) => {
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
=======
    const handleLogout = () => {
        clearAuthStorage();
        window.dispatchEvent(new Event("auth-change"));
        navigate("/login");
    };

    return (
        <>
            <style>{SIDEBAR_CSS}</style>
            <aside
                aria-expanded={!collapsed}
                style={{
                    width: collapsed ? 64 : 256,
                    height: "100vh",
                    position: "sticky",
                    top: 0,
                    display: "flex",
                    flexDirection: "column",
                    flexShrink: 0,
                    transition: "width .2s ease-in-out",
                    background: "var(--nav-dark)",
                    borderRight: "1px solid rgba(255,255,255,.08)",
                    fontFamily: "'Lexend','Be Vietnam Pro','Segoe UI',sans-serif",
                }}
            >
                {/* Header / Brand */}
                <div
                    className="flex items-center justify-between p-4"
                    style={{ borderBottom: "1px solid rgba(255,255,255,.08)" }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            onClick={() => setCollapsed(v => !v)}
                            role="button"
                            aria-pressed={collapsed}
                            title={collapsed ? 'Mở sidebar' : 'Thu gọn sidebar'}
                            className="cursor-pointer flex items-center justify-center text-white font-bold rounded-lg w-10 h-10"
                            style={{ background: "var(--green)", boxShadow: "0 4px 14px rgba(30,110,67,.4)" }}
                        >
                            GP
                        </div>

                        <div className={`${collapsed ? 'hidden' : 'block'}`}>
                            <h1 className="font-bold text-lg text-white">GPMS</h1>
                            <p className="text-xs text-white/60">Owner workspace</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1, padding: "1rem .75rem", display: "flex", flexDirection: "column", gap: ".25rem" }}>
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className="osb-item"
                            style={({ isActive }) => ({
                                display: "flex",
                                alignItems: "center",
                                gap: ".7rem",
                                padding: ".65rem .9rem",
                                borderRadius: 10,
                                textDecoration: "none",
                                fontSize: ".84rem",
                                fontWeight: isActive ? 700 : 500,
                                color: isActive ? "var(--green-mid)" : "rgba(255,255,255,.75)",
                                background: isActive ? "var(--green-light)" : "transparent",
                                borderLeft: `3px solid ${isActive ? "var(--green)" : "transparent"}`,
                                transition: ".15s",
                            })}
                        >
                            <span style={{ display: "flex", flexShrink: 0 }}>{item.icon}</span>
                            <span style={{ display: collapsed ? "none" : "inline" }}>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Footer / profile */}
                <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
                    <NavLink
                        to="#"
                        className="osb-item w-full flex items-center gap-3 p-2 rounded-lg transition"
                        style={{ textDecoration: "none", color: "inherit" }}
                    >
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                            👤
                        </div>
                        <div style={{ display: collapsed ? "none" : "block" }}>
                            <p className="font-medium text-white">{userName}</p>
                            <p className="text-xs text-white/60">Owner</p>
                        </div>
                    </NavLink>

                    <button
                        onClick={handleLogout}
                        className="osb-logout mt-4 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-red-600 transition"
                        type="button"
                    >
                        <LogOut size={16} />
                        <span style={{ display: collapsed ? "none" : "inline" }}>Đăng xuất</span>
                    </button>
                </div>
            </aside>
        </>
    );
>>>>>>> develop
}
