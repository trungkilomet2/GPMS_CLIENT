import React from "react";

export default function ProfileHeader({ title, user }) {

  return (
    <header className="customer-header">

      <div className="customer-header-title">
        {title}
      </div>

      <div className="customer-header-user">

        <span>{user.name}</span>

        <img
          src={user.avatar}
          alt="avatar"
          className="header-avatar"
        />

      </div>

    </header>
  );
}