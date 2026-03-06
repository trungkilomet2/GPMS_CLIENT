import { NavLink } from "react-router-dom";

export default function CustomerSidebar() {

  const handleLogout = () => {

    console.log("Logout");

    // sau này có thể clear token ở đây

  };

  return (

    <aside className="customer-sidebar">

      <div className="sidebar-brand">
        <div className="sidebar-logo">GPMS</div>
        <div className="sidebar-sub">Khách hàng</div>
      </div>


      <nav className="sidebar-nav">

        <NavLink
          to="/profile"
          className={({isActive}) =>
            isActive ? "sidebar-item active" : "sidebar-item"
          }
        >
          👤 Hồ sơ cá nhân
        </NavLink>

        <NavLink
          to="/notifications"
          className="sidebar-item"
        >
          🔔 Thông báo
        </NavLink>

        <NavLink
          to="/orders"
          className="sidebar-item"
        >
          📦 Lịch sử đơn hàng
        </NavLink>

      </nav>


      <div className="sidebar-bottom">

        <button
          className="logout-btn"
          onClick={handleLogout}
        >
          🚪 Đăng xuất
        </button>

      </div>

    </aside>

  );

}