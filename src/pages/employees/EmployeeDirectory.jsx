import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";
import "@/styles/employees.css";

const DIRECTORY_ITEMS = [
  {
    to: "/employees/management",
    title: "Nhóm quản lý",
    description: "Xem riêng Chủ xưởng, Quản lý sản xuất và Quản trị viên trong hệ thống.",
  },
  {
    to: "/employees/workers",
    title: "Nhân viên",
    description: "Xem riêng danh sách nhân viên để theo dõi nhân sự vận hành.",
  },
  {
    to: "/worker-roles",
    title: "Chuyên môn thợ",
    description: "Xem danh mục chuyên môn thợ và số lượng nhân sự đang được gán.",
  },
];

export default function EmployeeDirectory() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getStoredUser();
  const primaryRole = getPrimaryWorkspaceRole(user?.role);
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState("success");
  const visibleItems = primaryRole === "pm"
    ? DIRECTORY_ITEMS.filter((item) => item.to === "/employees/workers" || item.to === "/worker-roles")
    : DIRECTORY_ITEMS;

  useEffect(() => {
    if (!location.state?.notice) return;

    setNotice(location.state.notice);
    setNoticeTone(location.state.noticeTone === "error" ? "error" : "success");

    navigate(location.pathname, { replace: true });
  }, [location.pathname, location.state, navigate]);

  return (
    <DashboardLayout>
      <div className="employee-page">
        <div className="employee-shell mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="employee-hero">
            <div>
              <p className="employee-hero__eyebrow">Nhân sự nội bộ</p>
              <h1 className="employee-hero__title">Danh sách nhân viên</h1>
              <p className="employee-hero__subtitle">
                Chọn khu vực bạn muốn xem: nhóm quản lý, nhân viên sản xuất hoặc danh mục chuyên môn thợ.
              </p>
            </div>
          </div>

          {notice ? (
            <div
              className={`employee-inline-banner ${
                noticeTone === "error"
                  ? "employee-inline-banner--error"
                  : "employee-inline-banner--success"
              }`}
            >
              <span>{notice}</span>
            </div>
          ) : null}

          <div className="employee-directory-list">
            {visibleItems.map(({ to, title, description }) => (
              <Link key={to} to={to} className="employee-directory-row">
                <div className="employee-directory-card__content">
                  <h2 className="employee-directory-card__title">{title}</h2>
                  <p className="employee-directory-card__description">{description}</p>
                </div>
                <span className="employee-directory-row__arrow" aria-hidden="true">
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
