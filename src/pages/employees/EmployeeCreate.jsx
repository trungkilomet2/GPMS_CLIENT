import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CircleAlert,
  LoaderCircle,
  ShieldCheck,
  UserRound,
  UserRoundCog,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  EMPLOYEE_FORM_ROLE_OPTIONS,
  SYSTEM_ROLE_IDS,
  USER_STATUS_IDS,
  getAllowedManagerRoles,
  getManagerRoleHint,
  getSystemRoleLabel,
  isManagerRequired,
} from "@/lib/orgHierarchy";
import { normalizeSpaces, validateFullName, validatePassword, validateUserName } from "@/lib/validators";
import WorkerService, { getEmployeeModuleErrorMessage } from "@/services/WorkerService";
import "@/styles/employee-create.css";

export default function EmployeeCreate() {
  const navigate = useNavigate();
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [managerOptions, setManagerOptions] = useState([]);
  const [managerLoading, setManagerLoading] = useState(true);
  const [managerError, setManagerError] = useState("");
  const [form, setForm] = useState({
    userName: "",
    password: "",
    fullName: "",
    role: "PM",
    managerId: "",
    statusId: USER_STATUS_IDS.Active,
  });

  useEffect(() => {
    let mounted = true;

    const loadManagers = async () => {
      setManagerLoading(true);
      setManagerError("");

      try {
        const response = await WorkerService.getAllEmployees();
        if (!mounted) return;
        setManagerOptions(response?.data ?? []);
      } catch (error) {
        if (!mounted) return;
        setManagerError(
          getEmployeeModuleErrorMessage(
            error,
            "Không tải được danh sách quản lý để gán tuyến báo cáo."
          )
        );
      } finally {
        if (mounted) setManagerLoading(false);
      }
    };

    loadManagers();

    return () => {
      mounted = false;
    };
  }, []);

  const allowedManagerRoles = useMemo(
    () => getAllowedManagerRoles(form.role),
    [form.role]
  );

  const availableManagers = useMemo(
    () =>
      managerOptions.filter((employee) =>
        employee.roles.some((role) => allowedManagerRoles.includes(role))
      ),
    [allowedManagerRoles, managerOptions]
  );

  useEffect(() => {
    if (!form.managerId) return;

    const isValidSelection = availableManagers.some(
      (manager) => String(manager.id) === String(form.managerId)
    );

    if (!isValidSelection) {
      setForm((prev) => ({
        ...prev,
        managerId: "",
      }));
    }
  }, [availableManagers, form.managerId]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
    setSubmitError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedUserName = String(form.userName ?? "").trim();
    const normalizedFullName = normalizeSpaces(form.fullName);

    const nextErrors = {
      userName: validateUserName(normalizedUserName),
      password: validatePassword(form.password),
      fullName: validateFullName(normalizedFullName),
      role: SYSTEM_ROLE_IDS[form.role] ? "" : "Vai trò không hợp lệ",
      managerId:
        isManagerRequired(form.role) && !String(form.managerId ?? "").trim()
          ? "Vui lòng chọn quản lý trực tiếp"
          : "",
    };

    setFieldErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      setSubmitError("Vui lòng kiểm tra lại thông tin bắt buộc trước khi tạo nhân viên.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const parsedManagerId = Number(form.managerId);
      await WorkerService.createEmployee({
        userName: normalizedUserName,
        password: form.password,
        fullName: normalizedFullName,
        managerId:
          form.role === "Owner" || !Number.isFinite(parsedManagerId) || parsedManagerId <= 0
            ? null
            : parsedManagerId,
        roleIds: [SYSTEM_ROLE_IDS[form.role]],
        statusId: USER_STATUS_IDS.Active,
      });

      navigate("/employees");
    } catch (error) {
      const message = getEmployeeModuleErrorMessage(
        error,
        "Không thể tạo nhân viên mới. Vui lòng thử lại."
      );
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="employee-create-page">
        <div className="employee-create-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="employee-create-hero">
            <div className="employee-create-hero__heading">
              <Link to="/employees" className="employee-create-hero__back">
                <ArrowLeft size={20} />
                <span>Quay lại danh sách</span>
              </Link>
              <h1 className="employee-create-hero__title">Thêm nhân viên mới</h1>
              <p className="employee-create-hero__subtitle">
                Tạo tài khoản nhân sự theo hierarchy 1 Owner, nhiều PM, mỗi PM quản lý team lead và worker của line mình.
              </p>
            </div>

            <div className="employee-create-hero__actions">
              <button type="button" className="employee-create-btn employee-create-btn--ghost" onClick={() => navigate("/employees")}>
                Hủy
              </button>
              <button
                type="submit"
                form="employee-create-form"
                className="employee-create-btn employee-create-btn--primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? <LoaderCircle size={18} className="employee-create-btn__spin" /> : null}
                <span>{isSubmitting ? "Đang tạo..." : "Thêm nhân viên"}</span>
              </button>
            </div>
          </div>

          <form id="employee-create-form" className="employee-create-single" onSubmit={handleSubmit}>
            <section className="employee-create-card">
              <div className="employee-create-card__header">
                <div>
                  <h2 className="employee-create-card__title">Thông tin tài khoản nhân viên</h2>
                </div>
              </div>

              <div className="employee-create-form-grid employee-create-form-grid--single">
                <label className="employee-create-field">
                  <span className="employee-create-field__label">Tên đăng nhập</span>
                  <UserRound size={18} className="employee-create-field__icon" />
                  <input value={form.userName} onChange={handleChange("userName")} placeholder="Nhập tên đăng nhập" className="employee-create-field__control" />
                  {fieldErrors.userName ? <span className="employee-create-field__error">{fieldErrors.userName}</span> : null}
                </label>

                <label className="employee-create-field">
                  <span className="employee-create-field__label">Mật khẩu</span>
                  <ShieldCheck size={18} className="employee-create-field__icon" />
                  <input type="password" value={form.password} onChange={handleChange("password")} placeholder="Nhập mật khẩu" className="employee-create-field__control" />
                  {fieldErrors.password ? <span className="employee-create-field__error">{fieldErrors.password}</span> : null}
                </label>

                <label className="employee-create-field employee-create-field--full">
                  <span className="employee-create-field__label">Họ và tên</span>
                  <UserRoundCog size={18} className="employee-create-field__icon" />
                  <input value={form.fullName} onChange={handleChange("fullName")} placeholder="Nhập họ và tên" className="employee-create-field__control" />
                  {fieldErrors.fullName ? <span className="employee-create-field__error">{fieldErrors.fullName}</span> : null}
                </label>

                <label className="employee-create-field">
                  <span className="employee-create-field__label">Vai trò hệ thống</span>
                  <ShieldCheck size={18} className="employee-create-field__icon" />
                  <select value={form.role} onChange={handleChange("role")} className="employee-create-field__control">
                    {EMPLOYEE_FORM_ROLE_OPTIONS.map((roleOption) => (
                      <option key={roleOption.value} value={roleOption.value}>
                        {roleOption.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.role ? <span className="employee-create-field__error">{fieldErrors.role}</span> : null}
                </label>

                <label className="employee-create-field">
                  <span className="employee-create-field__label">Quản lý trực tiếp</span>
                  <BriefcaseBusiness size={18} className="employee-create-field__icon" />
                  <select
                    value={form.managerId}
                    onChange={handleChange("managerId")}
                    className="employee-create-field__control"
                    disabled={form.role === "Owner" || managerLoading}
                  >
                    <option value="">
                      {form.role === "Owner"
                        ? "Owner không có quản lý trực tiếp"
                        : managerLoading
                          ? "Đang tải danh sách quản lý..."
                          : availableManagers.length
                            ? "Chọn quản lý trực tiếp"
                            : "Chưa có quản lý phù hợp"}
                    </option>
                    {availableManagers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.fullName} - {getSystemRoleLabel(manager.primarySystemRole || manager.roles[0] || "")}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.managerId ? <span className="employee-create-field__error">{fieldErrors.managerId}</span> : null}
                </label>
              </div>

              <div className="employee-create-banner">
                <span>{getManagerRoleHint(form.role)}</span>
              </div>

              {managerError ? (
                <div className="employee-create-banner employee-create-banner--error">
                  <CircleAlert size={18} />
                  <span>{managerError}</span>
                </div>
              ) : null}

              {submitError ? (
                <div className="employee-create-banner employee-create-banner--error">
                  <CircleAlert size={18} />
                  <span>{submitError}</span>
                </div>
              ) : null}
            </section>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
