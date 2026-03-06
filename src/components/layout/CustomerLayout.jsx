import React from "react";
import CustomerSidebar from "@/components/layout/CustomerSidebar";
import ProfileHeader from "@/components/layout/ProfileHeader";
import "@/styles/profile.css";

export default function CustomerLayout({ title, children }) {

  const user = {
    name: "Nguyễn Văn A",
    avatar: "https://i.pravatar.cc/150?img=3",
  };

  return (
    <div className="customer-layout">

      <CustomerSidebar user={user} />

      <div className="customer-main">

        <ProfileHeader title={title} user={user} />

        <div className="customer-page">
          {children}
        </div>

      </div>

    </div>
  );
}