import React from "react";

export default function ProfileCard({ user }) {

  return (
    <div className="profile-hero">

      <img
        src={user.avatar}
        alt="avatar"
        className="profile-avatar"
      />

      <div>

        <h2>{user.name}</h2>

        <p>Khách hàng</p>

        <span className="status">
          ● Đang hoạt động
        </span>

      </div>

    </div>
  );
}