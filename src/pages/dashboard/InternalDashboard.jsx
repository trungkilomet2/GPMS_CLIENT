import { createElement } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, ClipboardList, ContactRound, Users } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole, splitRoles } from "@/lib/internalRoleFlow";
import "@/styles/internal-dashboard.css";

const QUICK_LINKS = [
  {
    to: "/customers",
    title: "Quản lý khách hàng",
    description: "Xem danh sách khách hàng và order của từng khách trong một màn hình.",
    icon: ContactRound,
  },
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

export default function InternalDashboard() {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roles = splitRoles(user.role);
  const primaryRole = getPrimaryWorkspaceRole(roles);
  const isAdmin = primaryRole === "admin";
  const isInternalUser = primaryRole === "owner" || primaryRole === "pm";
  const isOwner = primaryRole === "owner";

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
          description: "Tách riêng khu quản lý, nhân viên và màn xem worker skill.",
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
              <div className="internal-dashboard-hero__role">
                {roles
                  .map((r) => {
                    const lowered = r.toLowerCase();
                    if (lowered === "owner") return "Chủ xưởng";
                    if (lowered === "pm") return "Quản lý sản xuất";
                    if (lowered === "admin") return "Quản trị viên";
                    if (lowered === "worker") return "Nhân viên";
                    return r;
                  })
                  .join(", ") || "Người dùng nội bộ"}
              </div>
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



