/* ═══════════════════════════════════════════════════════
   FILE: CustomerSidebar.jsx
   Sidebar dọc cho customer layout — full inline styles
═══════════════════════════════════════════════════════ */

import { NavLink, useNavigate } from "react-router-dom";

const T = {
  dark:    "#0d4225",
  mid:     "#186637",
  base:    "#1e8a47",
  light:   "#eaf4ee",
  border:  "#d0e8d9",
  sand:    "#f4f7f5",
  white:   "#ffffff",
  text:    "#18291f",
  textMid: "#4a6456",
  textLt:  "#8ca898",
  red:     "#dc2626",
  redBg:   "#fef2f2",
};

const SIDEBAR_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700;800&display=swap');
  .csb-item:hover {
    background: ${T.light} !important;
    color: ${T.mid} !important;
  }
  .csb-item:hover svg { stroke: ${T.mid} !important; }
  .csb-logout:hover {
    background: ${T.redBg} !important;
    color: ${T.red} !important;
  }
  .csb-logout:hover svg { stroke: ${T.red} !important; }
`;

const NAV_ITEMS = [
  {
    to: "/profile",
    label: "Hồ sơ cá nhân",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    to: "/notifications",
    label: "Thông báo",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
  {
    to: "/orders",
    label: "Lịch sử đơn hàng",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      </svg>
    ),
  },
];

export default function CustomerSidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth-change"));
    navigate("/login");
  };

  return (
    <>
      <style>{SIDEBAR_CSS}</style>
      <aside style={{
        width: 220,
        minHeight: "100vh",
        background: T.dark,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        fontFamily: "'Lexend','Be Vietnam Pro','Segoe UI',sans-serif",
      }}>

        {/* Brand */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: ".7rem",
          padding: "1.5rem 1.25rem 1.25rem",
          borderBottom: "1px solid rgba(255,255,255,.08)",
        }}>
          <div style={{
            width: 36, height: 36,
            background: T.base,
            borderRadius: 9,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.1rem",
            boxShadow: "0 3px 10px rgba(30,138,71,.4)",
            flexShrink: 0,
          }}>🧵</div>
          <div>
            <div style={{ fontSize: ".88rem", fontWeight: 800, color: T.white, lineHeight: 1.2 }}>GPMS</div>
            <div style={{ fontSize: ".67rem", color: "rgba(255,255,255,.5)", fontWeight: 500, marginTop: ".1rem" }}>Khách hàng</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: ".75rem .65rem", display: "flex", flexDirection: "column", gap: ".2rem" }}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className="csb-item"
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: ".65rem",
                padding: ".65rem .9rem",
                borderRadius: 10,
                textDecoration: "none",
                fontSize: ".84rem",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? T.mid : "rgba(255,255,255,.72)",
                background: isActive ? T.light : "transparent",
                borderLeft: `3px solid ${isActive ? T.base : "transparent"}`,
                transition: ".15s",
              })}
            >
              <span style={{ display: "flex", flexShrink: 0 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,.08)", margin: "0 1rem" }} />

        {/* Logout */}
        <div style={{ padding: ".75rem .65rem 1.25rem" }}>
          <button
            className="csb-logout"
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".65rem",
              width: "100%",
              padding: ".65rem .9rem",
              background: "transparent",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: ".84rem",
              fontWeight: 500,
              color: "rgba(255,255,255,.6)",
              textAlign: "left",
              transition: ".15s",
              fontFamily: "'Lexend','Be Vietnam Pro','Segoe UI',sans-serif",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
}