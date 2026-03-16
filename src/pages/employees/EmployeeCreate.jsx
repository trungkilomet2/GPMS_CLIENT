import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CircleAlert,
  LoaderCircle,
  ShieldCheck,
  UserRound,
  UserRoundCog,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { normalizeSpaces, validateFullName, validatePassword, validateUserName } from "@/lib/validators";
import WorkerService, { getEmployeeModuleErrorMessage } from "@/services/WorkerService";
import "@/styles/employee-create.css";

const ROLE_ID_MAP = {
  Admin: 1,
  Customer: 2,
  Owner: 3,
  PM: 4,
  "Team Leader": 5,
  Worker: 6,
  KCS: 7,
};

const STATUS_ID_MAP = {
  Active: 1,
  Inactive: 2,
};

export default function EmployeeCreate() {
  const navigate = useNavigate();
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    userName: "",
    password: "",
    fullName: "",
    role: "PM",
    status: "Active",
  });

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
      role: ROLE_ID_MAP[form.role] ? "" : "Vai trò không hợp lệ",
      status: STATUS_ID_MAP[form.status] ? "" : "Trạng thái không hợp lệ",
    };

    setFieldErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      setSubmitError("Vui lòng kiểm tra lại thông tin bắt buộc trước khi tạo nhân viên.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await WorkerService.createEmployee({
        userName: normalizedUserName,
        password: form.password,
        fullName: normalizedFullName,
        statusId: STATUS_ID_MAP[form.status],
        roleIds: [ROLE_ID_MAP[form.role]],
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
                Nhập thông tin cơ bản để tạo tài khoản nhân viên trong hệ thống.
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
                    <option value="PM">Quản lý sản xuất</option>
                    <option value="Team Leader">Tổ trưởng</option>
                    <option value="Worker">Nhân viên</option>
                    <option value="KCS">Kiểm soát chất lượng</option>
                  </select>
                  {fieldErrors.role ? <span className="employee-create-field__error">{fieldErrors.role}</span> : null}
                </label>

                <label className="employee-create-field">
                  <span className="employee-create-field__label">Trạng thái</span>
                  <ShieldCheck size={18} className="employee-create-field__icon" />
                  <select value={form.status} onChange={handleChange("status")} className="employee-create-field__control">
                    <option value="Active">Đang hoạt động</option>
                    <option value="Inactive">Ngừng hoạt động</option>
                  </select>
                  {fieldErrors.status ? <span className="employee-create-field__error">{fieldErrors.status}</span> : null}
                </label>
              </div>

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
