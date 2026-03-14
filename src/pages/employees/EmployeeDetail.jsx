import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CircleAlert,
  LoaderCircle,
  Mail,
  Phone,
  Pencil,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import WorkerService, { getEmployeeModuleErrorMessage } from "@/services/WorkerService";
import "@/styles/employee-detail.css";

const STATUS_MAP = {
  active: { label: "Đang hoạt động", className: "employee-detail-pill employee-detail-pill--success" },
  inactive: { label: "Ngừng hoạt động", className: "employee-detail-pill employee-detail-pill--warning" },
};

function getInitials(name = "") {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(-2)
    .join("")
    .toUpperCase();
}

export default function EmployeeDetail() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [reloadSeed, setReloadSeed] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchEmployee = async () => {
      setLoading(true);
      setError("");
      setNotFound(false);

      try {
        const found = await WorkerService.getEmployeeById(id);
        if (!mounted) return;

        if (!found) {
          setNotFound(true);
          setError("Không tìm thấy nhân viên phù hợp.");
          setEmployee(null);
          return;
        }

        setEmployee(found);
      } catch (err) {
        if (!mounted) return;

        const message = getEmployeeModuleErrorMessage(
          err,
          "Không tải được thông tin nhân viên. Vui lòng thử lại."
        );
        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchEmployee();

    return () => {
      mounted = false;
    };
  }, [id, reloadSeed]);

  const handleRetry = () => {
    setReloadSeed((current) => current + 1);
  };

  const statusConfig = employee ? STATUS_MAP[employee.status] ?? STATUS_MAP.active : STATUS_MAP.active;
  const roles = useMemo(() => employee?.roleLabels ?? [], [employee]);

  return (
    <DashboardLayout>
      <div className="employee-detail-page">
        <div className="employee-detail-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="employee-detail-hero">
            <div className="employee-detail-hero__heading">
              <Link to="/employees" className="employee-detail-hero__back">
                <ArrowLeft size={20} />
                <span>Quay lại danh sách</span>
              </Link>
              <h1 className="employee-detail-hero__title">Thông tin chi tiết nhân viên</h1>
              <p className="employee-detail-hero__subtitle">Thông tin tài khoản và vai trò hiện có của nhân viên trong hệ thống.</p>
            </div>

            <Link to={`/employees/${id}/edit`} className="employee-detail-btn">
              <Pencil size={18} />
              <span>Sửa hồ sơ</span>
            </Link>
          </div>

          {loading ? (
            <div className="employee-detail-state">
              <LoaderCircle size={18} className="employee-detail-state__spin" />
              <div className="employee-detail-state__content">
                <strong>Đang tải thông tin nhân viên...</strong>
                <span>Hồ sơ đang được lấy từ hệ thống.</span>
              </div>
            </div>
          ) : error ? (
            <div className="employee-detail-state employee-detail-state--error">
              <CircleAlert size={18} />
              <div className="employee-detail-state__content">
                <strong>
                  {notFound
                    ? "Không tìm thấy nhân viên trong danh sách quản lý"
                    : "Không tải được thông tin nhân viên"}
                </strong>
                <span>{error}</span>
              </div>
              <div className="employee-detail-state__actions">
                {!notFound ? (
                  <button
                    type="button"
                    className="employee-detail-state-btn employee-detail-state-btn--primary"
                    onClick={handleRetry}
                  >
                    Thử lại
                  </button>
                ) : null}
                <Link
                  to="/employees"
                  className="employee-detail-state-btn employee-detail-state-btn--secondary"
                >
                  Quay lại danh sách
                </Link>
              </div>
            </div>
          ) : employee ? (
            <div className="employee-detail-grid employee-detail-grid--simple">
              <section className="employee-detail-card employee-detail-profile">
                <div className="employee-detail-profile__avatar">{getInitials(employee.fullName)}</div>
                <div className="employee-detail-profile__name">{employee.fullName}</div>
                <div className="employee-detail-profile__meta">
                  <span className={statusConfig.className}>{statusConfig.label}</span>
                  <span className="employee-detail-profile__username">@{employee.userName || "chua-cap-nhat"}</span>
                </div>
              </section>

              <section className="employee-detail-card">
                <div className="employee-detail-card__header">
                  <div className="employee-detail-card__icon">
                    <UserRound size={20} />
                  </div>
                  <div>
                    <h2 className="employee-detail-card__title">Thông tin tài khoản</h2>
                    <p className="employee-detail-card__subtitle">Các thông tin hiện đang có trong hồ sơ nhân viên.</p>
                  </div>
                </div>

                <div className="employee-detail-info-list">
                  <div className="employee-detail-info-item">
                    <UserRound size={17} />
                    <span>Tên đăng nhập: {employee.userName || "Chưa cập nhật"}</span>
                  </div>
                  <div className="employee-detail-info-item">
                    <Phone size={17} />
                    <span>Số điện thoại: {employee.phoneNumber || "Chưa cập nhật"}</span>
                  </div>
                  <div className="employee-detail-info-item">
                    <Mail size={17} />
                    <span>Email: {employee.email || "Chưa cập nhật"}</span>
                  </div>
                  <div className="employee-detail-info-item">
                    <ShieldCheck size={17} />
                    <span>Trạng thái: {statusConfig.label}</span>
                  </div>
                </div>
              </section>

              <section className="employee-detail-card">
                <div className="employee-detail-card__header">
                  <div className="employee-detail-card__icon">
                    <BriefcaseBusiness size={20} />
                  </div>
                  <div>
                    <h2 className="employee-detail-card__title">Vai trò trong hệ thống</h2>
                    <p className="employee-detail-card__subtitle">Vai trò hiện tại của nhân viên trong hệ thống.</p>
                  </div>
                </div>

                <div className="employee-detail-role-section">
                  <div className="employee-detail-role-block">
                    <div className="employee-detail-role-label">Vai trò hệ thống</div>
                    <div className="employee-detail-role-pills">
                      {roles.length ? roles.map((role) => (
                        <span key={role} className="employee-detail-machine-pill">
                          {role}
                        </span>
                      )) : (
                        <span className="employee-detail-role-empty">Chưa cập nhật vai trò</span>
                      )}
                    </div>
                  </div>

                  <div className="employee-detail-role-block">
                    <div className="employee-detail-role-label">Chuyên môn</div>
                    <div className="employee-detail-role-pills">
                      {employee.workerRole ? (
                        <span className="employee-detail-machine-pill">{employee.workerRoleLabel}</span>
                      ) : (
                        <span className="employee-detail-role-empty">Chưa cập nhật chuyên môn</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
}
