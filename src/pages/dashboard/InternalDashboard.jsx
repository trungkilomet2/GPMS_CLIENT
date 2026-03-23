import { createElement } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, ClipboardList, Users } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { getStoredUser } from "@/lib/authStorage";
import "@/styles/internal-dashboard.css";

const INTERNAL_ROLES = ["Owner", "PM"];
const ADMIN_ROLES = ["Admin"];

const QUICK_LINKS = [
  {
    to: "/production-plan",
    title: "Kế hoạch sản xuất",
    description: "Theo dõi và quản lý tiến độ các kế hoạch sản xuất trong xưởng.",
    icon: BriefcaseBusiness,
  },
  {
    to: "/leave",
    title: "Quản lý nghỉ phép",
    description: "Kiểm tra tình trạng nghỉ phép và xử lý đơn nhanh.",
    icon: ClipboardList,
  },
];

function splitRoles(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function InternalDashboard() {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roles = splitRoles(user.role);
  const isAdmin = roles.some((role) => ADMIN_ROLES.includes(role));
  const isInternalUser = roles.some((role) => INTERNAL_ROLES.includes(role));
  const isOwner = roles.includes("Owner");

  if (isAdmin) {
    return <Navigate to="/admin/users" replace />;
  }

  if (!isInternalUser) {
    return <Navigate to="/home" replace />;
  }

  const quickLinks = isOwner
    ? [
        {
          to: "/employees",
          title: "Danh sách nhân viên",
          description: "Quản lý nhân sự nội bộ và hồ sơ tài khoản.",
          icon: Users,
        },
        ...QUICK_LINKS,
      ]
    : QUICK_LINKS;

  return (
    <DashboardLayout>
      <div className="internal-dashboard-page">
        <div className="internal-dashboard-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <section className="internal-dashboard-hero">
            <div>
              <p className="internal-dashboard-hero__eyebrow">Khu vực nội bộ</p>
              <h1 className="internal-dashboard-hero__title">Bảng điều khiển quản trị</h1>
              <p className="internal-dashboard-hero__subtitle">
                Truy cập nhanh các chức năng quản lý dành cho {isOwner ? "chủ xưởng" : "quản lý sản xuất"}.
              </p>
            </div>

            <div className="internal-dashboard-hero__account">
              <div className="internal-dashboard-hero__label">Tài khoản hiện tại</div>
              <div className="internal-dashboard-hero__name">{user.fullName || user.name || user.userName}</div>
              <div className="internal-dashboard-hero__role">{roles.join(", ") || "Người dùng nội bộ"}</div>
            </div>
          </section>

          <section className="internal-dashboard-section">
            <div className="internal-dashboard-section__heading">
              <h2 className="internal-dashboard-section__title">Lối vào nhanh</h2>
              <p className="internal-dashboard-section__subtitle">
                Chọn chức năng bạn muốn làm việc trong phiên quản trị này.
              </p>
            </div>

            <div className="internal-dashboard-grid">
              {quickLinks.map(({ to, title, description, icon: Icon }) => (
                <Link key={to} to={to} className="internal-dashboard-card">
                  <div className="internal-dashboard-card__icon">
                    {createElement(Icon, { size: 22 })}
                  </div>
                  <div className="internal-dashboard-card__content">
                    <h3 className="internal-dashboard-card__title">{title}</h3>
                    <p className="internal-dashboard-card__description">{description}</p>
                  </div>
                  <span className="internal-dashboard-card__arrow">
                    <ArrowRight size={18} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}



