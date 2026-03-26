import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CircleAlert,
  LoaderCircle,
  MapPin,
  Mail,
  Phone,
  Pencil,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";
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
  const currentUser = getStoredUser();
  const primaryRole = getPrimaryWorkspaceRole(currentUser?.role);
  const isOwner = primaryRole === "owner";
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
        const isPm = primaryRole === "pm";
        const directoryResponse = isPm
          ? await WorkerService.getEmployeeDirectoryByPmScope({ pageSize: 100 }).catch(() => ({ data: [] }))
          : await WorkerService.getEmployeeDirectory({ pageSize: 100 }).catch(() => ({ data: [] }));
        if (!mounted) return;

        const directoryEmployees = directoryResponse?.data ?? [];
        const directoryEmployee = directoryEmployees.find(
          (item) => String(item.id) === String(id)
        );

        // PM detail access must stay inside their scoped directory; avoid trusting a broader detail endpoint.
        if (isPm && !directoryEmployee) {
          setNotFound(true);
          setError("Bạn không có quyền xem nhân viên này hoặc nhân viên không thuộc phạm vi quản lý.");
          setEmployee(null);
          return;
        }

        const found = directoryEmployee
          ? await WorkerService.getEmployeeById(id).catch((err) => {
              if (isPm && err?.response?.status === 403) {
                return null;
              }
              throw err;
            })
          : null;
        if (!mounted) return;

        const sourceEmployee = found ?? directoryEmployee ?? null;

        if (!sourceEmployee) {
          setNotFound(true);
          setError("Không tìm thấy nhân viên phù hợp.");
          setEmployee(null);
          return;
        }

        const resolvedManagerId = sourceEmployee.managerId ?? directoryEmployee?.managerId ?? null;
        const resolvedManager = directoryEmployees.find(
          (item) => String(item.id) === String(resolvedManagerId)
        );

        setEmployee({
          ...sourceEmployee,
          managerId: resolvedManagerId,
          managerName:
            sourceEmployee.managerName ||
            directoryEmployee?.managerName ||
            resolvedManager?.fullName ||
            "",
          workerSkill: sourceEmployee.workerSkill || directoryEmployee?.workerSkill || "",
          workerSkillLabel:
            sourceEmployee.workerSkillLabel || directoryEmployee?.workerSkillLabel || "",
          role: sourceEmployee.role || directoryEmployee?.role || "",
          roles: sourceEmployee.roles?.length ? sourceEmployee.roles : directoryEmployee?.roles ?? [],
          roleLabels:
            sourceEmployee.roleLabels?.length ? sourceEmployee.roleLabels : directoryEmployee?.roleLabels ?? [],
        });
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
  }, [id, primaryRole, reloadSeed]);

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
              <p className="employee-detail-hero__subtitle">Thông tin tài khoản, vai trò hệ thống, chuyên môn và tuyến quản lý của nhân viên trong hệ thống.</p>
            </div>

            {isOwner ? (
              <Link to={`/employees/${id}/edit`} className="employee-detail-btn">
                <Pencil size={18} />
                <span>Sửa hồ sơ</span>
              </Link>
            ) : null}
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
                <div className="employee-detail-profile__avatar">
                  {employee.avatarUrl ? (
                    <img
                      src={employee.avatarUrl}
                      alt={employee.fullName}
                      className="employee-detail-profile__avatar-image"
                    />
                  ) : (
                    getInitials(employee.fullName)
                  )}
                </div>
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
                    <MapPin size={17} />
                    <span>Địa chỉ: {employee.location || "Chưa cập nhật"}</span>
                  </div>
                  <div className="employee-detail-info-item">
                    <ShieldCheck size={17} />
                    <span>Trạng thái: {statusConfig.label}</span>
                  </div>
                  <div className="employee-detail-info-item">
                    <BriefcaseBusiness size={17} />
                    <span>Quản lý trực tiếp: {employee.managerName || "Chưa cập nhật"}</span>
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
                      {employee.workerSkill ? (
                        <span className="employee-detail-machine-pill">{employee.workerSkillLabel}</span>
                      ) : (
                        <span className="employee-detail-role-empty">Chưa cập nhật chuyên môn</span>
                      )}
                    </div>
                  </div>

                  <div className="employee-detail-role-block">
                    <div className="employee-detail-role-label">Hierarchy</div>
                    <div className="employee-detail-role-pills">
                      <span className="employee-detail-machine-pill">{employee.hierarchyTag || "Chưa phân loại"}</span>
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
