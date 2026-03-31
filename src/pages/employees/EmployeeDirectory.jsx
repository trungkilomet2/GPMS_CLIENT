import { Link } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, Sparkles, Users } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";
import "@/styles/employees.css";

const DIRECTORY_ITEMS = [
  {
    to: "/employees/management",
    title: "Nhóm quản lý",
    description: "Xem riêng Owner, PM và Admin trong hệ thống.",
    icon: BriefcaseBusiness,
    tone: "warning",
  },
  {
    to: "/employees/workers",
    title: "Nhân viên",
    description: "Xem riêng danh sách worker để theo dõi nhân sự vận hành.",
    icon: Users,
    tone: "primary",
  },
  {
    to: "/worker-roles",
    title: "Worker skill",
    description: "Xem danh mục chuyên môn thợ và số lượng nhân sự đang được gán.",
    icon: Sparkles,
    tone: "accent",
  },
];

export default function EmployeeDirectory() {
  const user = getStoredUser();
  const primaryRole = getPrimaryWorkspaceRole(user?.role);
  const visibleItems = primaryRole === "pm"
    ? DIRECTORY_ITEMS.filter((item) => item.to === "/employees/workers" || item.to === "/worker-roles")
    : DIRECTORY_ITEMS;

  return (
    <DashboardLayout>
      <div className="employee-page">
        <div className="employee-shell mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="employee-hero">
            <div>
              <p className="employee-hero__eyebrow">Nhân sự nội bộ</p>
              <h1 className="employee-hero__title">Danh sách nhân viên</h1>
              <p className="employee-hero__subtitle">
                Chọn khu vực bạn muốn xem: nhóm quản lý, nhân viên sản xuất hoặc danh mục worker skill.
              </p>
            </div>
          </div>

          <div className="employee-directory-grid">
            {visibleItems.map(({ to, title, description, icon: Icon, tone }) => (
              <Link key={to} to={to} className={`employee-directory-card employee-directory-card--${tone}`}>
                <div className="employee-directory-card__icon">
                  <Icon size={24} />
                </div>
                <div className="employee-directory-card__content">
                  <h2 className="employee-directory-card__title">{title}</h2>
                  <p className="employee-directory-card__description">{description}</p>
                </div>
                <span className="employee-directory-card__arrow">
                  <ArrowRight size={18} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
