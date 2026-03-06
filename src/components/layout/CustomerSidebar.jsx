import React from "react";
import { NavLink } from "react-router-dom";

export default function CustomerSidebar({ user }) {

  return (
    <aside className="customer-sidebar">

      <div className="sidebar-brand">
        <div className="sidebar-logo">GPMS</div>
        <div className="sidebar-sub">Khách hàng</div>
      </div>

      <nav className="sidebar-nav">

        <NavLink to="/profile" className="sidebar-item">
          👤 Hồ sơ cá nhân
        </NavLink>

        <NavLink to="/notifications" className="sidebar-item">
          🔔 Thông báo
        </NavLink>

        <NavLink to="/orders" className="sidebar-item">
          📦 Lịch sử đơn hàng
        </NavLink>

      </nav>

      <div className="sidebar-user">

        <img
          src={user.avatar}
          alt="avatar"
          className="sidebar-avatar"
        />

        <div>{user.name}</div>

      </div>

    </aside>
  );
}