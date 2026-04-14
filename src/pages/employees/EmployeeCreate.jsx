import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
  UserRound,
  UserRoundCog,
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  EMPLOYEE_CREATE_ROLE_OPTIONS,
  SYSTEM_ROLE_IDS,
  getDirectManagerRoleLabel,
  getManagerRoleHint,
  isEligibleDirectManager,
  isManagerRequired,
} from "@/lib/orgHierarchy";
import { getStoredUser } from "@/lib/authStorage";
import { normalizeSpaces, validateFullName, validatePassword, validateUserName } from "@/lib/validators";
import WorkerService, { getEmployeeModuleErrorMessage } from "@/services/WorkerService";
import "@/styles/employee-create.css";

export default function EmployeeCreate() {
  const location = useLocation();
  const navigate = useNavigate();
  const backTarget = location.state?.from || "/employees";
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [noticeTone, setNoticeTone] = useState(location.state?.noticeTone === "error" ? "error" : "success");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [managerOptions, setManagerOptions] = useState([]);
  const [managerLoading, setManagerLoading] = useState(true);
  const [managerError, setManagerError] = useState("");
  const [form, setForm] = useState({
    userName: "",
    password: "",
    fullName: "",
    role: "PM",
    managerId: "",
  });
  const currentUser = useMemo(() => getStoredUser() || {}, []);
  const currentUserId = String(currentUser?.userId ?? currentUser?.id ?? "").trim();

  useEffect(() => {
    if (!location.state?.notice) return;

    setNotice(location.state.notice);
    setNoticeTone(location.state.noticeTone === "error" ? "error" : "success");
    navigate(location.pathname, { replace: true });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    let mounted = true;

    const loadManagers = async () => {
      setManagerLoading(true);
      setManagerError("");

      try {
        const response = await WorkerService.getManagerDirectory({
          pageSize: 100,
        });
        if (!mounted) return;
        setManagerOptions(response?.data ?? []);
      } catch (error) {
        if (!mounted) return;
        setManagerError(getEmployeeModuleErrorMessage(error, "Không tải được danh sách quản lý để gán tuyến báo cáo."));
      } finally {
        if (mounted) setManagerLoading(false);
      }
    };

    loadManagers();

    return () => {
      mounted = false;
    };
  }, []);

  const availableManagers = useMemo(
    () =>
      managerOptions.filter((employee) => isEligibleDirectManager(employee, form.role)),
    [form.role, managerOptions]
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

  useEffect(() => {
    if (form.role !== "PM") return;

    const preferredOwner =
      availableManagers.find((manager) => String(manager.id) === currentUserId) ??
      (availableManagers.length === 1 ? availableManagers[0] : null);

    if (!preferredOwner) return;
    if (String(form.managerId ?? "").trim() === String(preferredOwner.id)) return;

    setForm((prev) => ({
      ...prev,
      managerId: String(preferredOwner.id),
    }));
  }, [availableManagers, currentUserId, form.managerId, form.role]);

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

  const handleCreateEmployee = async (payload) => {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const createdEmployee = await WorkerService.createEmployee(payload);
      const createdId = createdEmployee?.data?.id ?? createdEmployee?.id ?? null;

      if (payload.roleIds?.includes(SYSTEM_ROLE_IDS.Worker) && createdId != null) {
        navigate(`/employees/${createdId}/skills`, {
          state: {
            fromCreate: true,
            notice: `Đã tạo tài khoản nhân viên ${payload.fullName} thành công. Hãy gán chuyên môn phù hợp trước khi hoàn tất.`,
            noticeTone: "success",
          },
        });
        return;
      }

      navigate("/employees/management", {
        state: {
          notice: `Đã tạo tài khoản quản lý ${payload.fullName} thành công.`,
          noticeTone: "success",
        },
      });
    } catch (error) {
      const message = getEmployeeModuleErrorMessage(
        error,
        "Không thể tạo nhân viên mới. Vui lòng thử lại."
      );
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
      setIsConfirmOpen(false);
      setPendingPayload(null);
    }
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

    setPendingPayload({
      userName: normalizedUserName,
      password: form.password,
      fullName: normalizedFullName,
      managerId: form.role === "Owner" ? null : Number(form.managerId),
      roleIds: [SYSTEM_ROLE_IDS[form.role]],
    });
    setIsConfirmOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="employee-create-page">
        <div className="employee-create-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="employee-create-hero">
            <div className="employee-create-hero__heading">
              <Link to={backTarget} className="employee-create-hero__back">
                <ArrowLeft size={20} />
                <span>Quay lại danh sách</span>
              </Link>
              <h1 className="employee-create-hero__title">Thêm nhân viên mới</h1>
              <p className="employee-create-hero__subtitle">
                Tạo tài khoản nhân sự theo sơ đồ quản lý của xưởng: Chủ xưởng quản lý Quản lý sản xuất, và Quản lý sản xuất phụ trách nhân viên trực thuộc.
              </p>
            </div>

            <div className="employee-create-hero__actions">
              <button type="button" className="employee-create-btn employee-create-btn--ghost" onClick={() => navigate(backTarget)}>
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
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange("password")}
                    placeholder="Nhập mật khẩu"
                    className="employee-create-field__control employee-create-field__control--with-toggle"
                  />
                  <button
                    type="button"
                    className="employee-create-field__toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
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
                    {EMPLOYEE_CREATE_ROLE_OPTIONS.map((roleOption) => (
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
                        ? "Chủ xưởng không có quản lý trực tiếp"
                        : managerLoading
                          ? "Đang tải danh sách quản lý..."
                          : availableManagers.length
                            ? "Chọn quản lý trực tiếp"
                            : "Chưa có quản lý phù hợp"}
                    </option>
                    {availableManagers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.fullName} - {getDirectManagerRoleLabel(manager, form.role)}
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

              {notice ? (
                <div
                  className={`employee-create-banner ${
                    noticeTone === "error" ? "employee-create-banner--error" : ""
                  }`}
                >
                  <span>{notice}</span>
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
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Xác nhận tạo nhân viên"
        description={`Bạn có chắc muốn thêm tài khoản ${pendingPayload?.fullName || "nhân viên này"} không?`}
        primaryLabel="Xác nhận thêm"
        showConfirmIcon={false}
        onConfirm={() => {
          if (!pendingPayload || isSubmitting) return;
          handleCreateEmployee(pendingPayload);
        }}
        onClose={() => {
          if (isSubmitting) return;
          setIsConfirmOpen(false);
          setPendingPayload(null);
        }}
      />
    </DashboardLayout>
  );
}
