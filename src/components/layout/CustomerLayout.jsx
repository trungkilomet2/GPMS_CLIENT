import React from "react";
import CustomerSidebar from "@/components/layout/CustomerSidebar";
import ProfileHeader from "@/components/layout/ProfileHeader";
import Breadcrumbs from "@/components/Breadcrumbs";
import "@/styles/profile.css";

export default function CustomerLayout({ title, children }) {
  return (
    <div className="customer-layout">
      <CustomerSidebar />
      <div className="customer-main">
        <ProfileHeader title={title} />
        <Breadcrumbs />
        <div className="customer-page">
          {children}
        </div>
      </div>
    </div>
  );
}
