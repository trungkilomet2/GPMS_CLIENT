import { NavLink, useNavigate } from "react-router-dom";

export default function CustomerSidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    console.log("Logout");
    // clear token ở đây
  };

  return (
    <aside className="customer-sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo-mark">G</div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">GPMS</span>
          <span className="sidebar-brand-role">Khách hàng</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <NavLink to="/profile" className={({ isActive }) => `sidebar-item ${isActive ? "sidebar-item--active" : ""}`}>
          <span className="sidebar-item__icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </span>
          <span>Hồ sơ cá nhân</span>
        </NavLink>

        <NavLink to="/notifications" className={({ isActive }) => `sidebar-item ${isActive ? "sidebar-item--active" : ""}`}>
          <span className="sidebar-item__icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </span>
          <span>Thông báo</span>
        </NavLink>

        <NavLink to="/orders" className={({ isActive }) => `sidebar-item ${isActive ? "sidebar-item--active" : ""}`}>
          <span className="sidebar-item__icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
          </span>
          <span>Lịch sử đơn hàng</span>
        </NavLink>
      </nav>

      {/* Logout */}
      <div className="sidebar-bottom">
        <button className="sidebar-logout" onClick={handleLogout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}