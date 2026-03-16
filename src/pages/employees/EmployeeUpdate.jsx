import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CircleAlert,
  LoaderCircle,
  ShieldCheck,
  UserRound,
  UserRoundCog,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { normalizeSpaces, validateFullName } from "@/lib/validators";
import WorkerService, { getEmployeeModuleErrorMessage } from "@/services/WorkerService";
import "@/styles/employee-create.css";

const ROLE_PRIORITY = ["Owner", "PM", "Team Leader", "Worker", "KCS", "Admin", "Customer"];

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
  active: 1,
  inactive: 2,
};

function pickRoleValue(roleString = "") {
  const roles = String(roleString)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }

  return "PM";
}

export default function EmployeeUpdate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    userName: "",
    fullName: "",
    role: "PM",
    status: "active",
  });

  useEffect(() => {
    let mounted = true;

    const fetchEmployee = async () => {
      setLoading(true);
      setError("");

      try {
        const employee = await WorkerService.getEmployeeById(id);

        if (!mounted) return;

        if (!employee) {
          setError("Không tìm thấy nhân viên phù hợp.");
          return;
        }

        setForm({
          userName: employee.userName || "",
          fullName: employee.fullName || "",
          role: pickRoleValue(employee.role),
          status: employee.status || "active",
        });
      } catch (err) {
        if (!mounted) return;
        setError(
          getEmployeeModuleErrorMessage(
            err,
            "Không tải được thông tin nhân viên. Vui lòng thử lại."
          )
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchEmployee();

    return () => {
      mounted = false;
    };
  }, [id]);

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

    const normalizedFullName = normalizeSpaces(form.fullName);
    const nextErrors = {
      fullName: validateFullName(normalizedFullName),
      role: ROLE_ID_MAP[form.role] ? "" : "Vai trò không hợp lệ",
      status: STATUS_ID_MAP[form.status] ? "" : "Trạng thái không hợp lệ",
    };

    setFieldErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      setSubmitError("Vui lòng kiểm tra lại thông tin trước khi lưu nhân viên.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await WorkerService.updateEmployee(id, {
        fullName: normalizedFullName,
        statusId: STATUS_ID_MAP[form.status],
        roleIds: [ROLE_ID_MAP[form.role]],
      });

      navigate(`/employees/${id}`);
    } catch (err) {
      setSubmitError(
        getEmployeeModuleErrorMessage(
          err,
          "Không thể cập nhật nhân viên. Vui lòng thử lại."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="employee-create-page">
        <div className="employee-create-shell mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="employee-create-hero">
            <div className="employee-create-hero__heading">
              <Link to={`/employees/${id}`} className="employee-create-hero__back">
                <ArrowLeft size={20} />
                <span>Quay lại chi tiết</span>
              </Link>
              <h1 className="employee-create-hero__title">Cập nhật thông tin nhân viên</h1>
              <p className="employee-create-hero__subtitle">
                Cập nhật các thông tin hiện đang cho phép chỉnh sửa trong hệ thống.
              </p>
            </div>

            <div className="employee-create-hero__actions">
              <button type="button" className="employee-create-btn employee-create-btn--ghost" onClick={() => navigate(`/employees/${id}`)}>
                Hủy
              </button>
              <button
                type="submit"
                form="employee-update-form"
                className="employee-create-btn employee-create-btn--primary"
                disabled={isSubmitting || loading}
              >
                {isSubmitting ? <LoaderCircle size={18} className="employee-create-btn__spin" /> : null}
                <span>{isSubmitting ? "Đang lưu..." : "Lưu nhân viên"}</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="employee-create-card">
              <div className="employee-create-banner">
                <LoaderCircle size={18} className="employee-create-btn__spin" />
                <span>Đang tải dữ liệu nhân viên...</span>
              </div>
            </div>
          ) : error ? (
            <div className="employee-create-card">
              <div className="employee-create-banner employee-create-banner--error">
                <CircleAlert size={18} />
                <span>{error}</span>
              </div>
            </div>
          ) : (
            <form id="employee-update-form" className="employee-create-single" onSubmit={handleSubmit}>
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
                    <input value={form.userName} disabled className="employee-create-field__control" />
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
                      <option value="Owner">Chủ xưởng</option>
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
                      <option value="active">Đang hoạt động</option>
                      <option value="inactive">Ngừng hoạt động</option>
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
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
