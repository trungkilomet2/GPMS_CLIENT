import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  LoaderCircle,
  ShieldCheck,
  UserRound,
  UserRoundCog,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { normalizeSpaces, validateFullName, validatePassword, validateUserName } from "@/lib/validators";
import AdminUserService, {
  getAdminRoleProfile,
  getAdminSupportedRoleOptions,
  getAdminUserErrorMessage,
} from "@/services/AdminUserService";
import {
  AdminBanner,
  AdminRoleBadge,
} from "@/pages/admin/adminShared";

export default function AdminUserCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    userName: "",
    password: "",
    roleKey: "PM",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleOptions = useMemo(() => getAdminSupportedRoleOptions(), []);
  const permissionProfile = useMemo(() => getAdminRoleProfile(form.roleKey), [form.roleKey]);

  const handleChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
    setFieldErrors((current) => ({
      ...current,
      [field]: "",
    }));
    setSubmitError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const normalizedValues = {
      fullName: normalizeSpaces(form.fullName),
      userName: String(form.userName ?? "").trim(),
      password: String(form.password ?? ""),
      roleKey: form.roleKey,
    };

    const errors = {
      fullName: validateFullName(normalizedValues.fullName),
      userName: validateUserName(normalizedValues.userName),
      password: validatePassword(normalizedValues.password),
      roleKey: normalizedValues.roleKey ? "" : "Vui lòng chọn role.",
    };

    setFieldErrors(errors);

    if (Object.values(errors).some(Boolean)) {
      setSubmitError("Vui lòng kiểm tra lại thông tin trước khi tạo user.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    AdminUserService.createUser(normalizedValues)
      .then((createdUser) => {
        const nextPath = createdUser?.id != null ? `/admin/users/${createdUser.id}` : "/admin/users";

        navigate(nextPath, {
          state: {
            notice: `Đã tạo user ${createdUser.fullName} thành công.`,
          },
        });
      })
      .catch((error) => {
        setSubmitError(
          getAdminUserErrorMessage(
            error,
            "Không thể tạo user mới. Vui lòng thử lại."
          )
        );
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <DashboardLayout>
      <div className="admin-page">
        <div className="admin-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="admin-hero">
            <div className="admin-hero__heading">
              <Link to="/admin/users" className="admin-hero__back">
                <ArrowLeft size={18} />
                <span>Quay lại danh sách user</span>
              </Link>
              <h1 className="admin-hero__title">Add New User Screen</h1>
              <p className="admin-hero__subtitle">
                Form onboarding cho Admin tạo account mới bằng API `create-user` và gán role ngay từ bước khởi tạo.
              </p>
            </div>

            <div className="admin-hero__actions">
              <Link to="/admin/users" className="admin-btn admin-btn--secondary">
                Hủy
              </Link>
              <button
                type="submit"
                form="admin-user-create-form"
                className="admin-btn admin-btn--primary admin-focusable"
                disabled={isSubmitting}
              >
                {isSubmitting ? <LoaderCircle size={18} className="animate-spin" /> : null}
                <span>{isSubmitting ? "Đang tạo..." : "Create User"}</span>
              </button>
            </div>
          </div>

          <div className="admin-grid admin-grid--form">
            <form id="admin-user-create-form" className="flex flex-col gap-6" onSubmit={handleSubmit}>
              <section className="admin-card">
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Thông tin account</h2>
                    <p className="admin-card__subtitle">API hiện hỗ trợ tạo user với họ tên, username, password và role.</p>
                  </div>
                </div>

                <div className="admin-form-grid">
                  <label className="admin-field">
                    <span className="admin-field__label">Họ và tên</span>
                    <UserRoundCog size={18} className="admin-field__icon" />
                    <input value={form.fullName} onChange={handleChange("fullName")} className="admin-field__control" placeholder="Nguyễn Văn A" />
                    {fieldErrors.fullName ? <span className="admin-field__error">{fieldErrors.fullName}</span> : null}
                  </label>

                  <label className="admin-field">
                    <span className="admin-field__label">Username</span>
                    <UserRound size={18} className="admin-field__icon" />
                    <input value={form.userName} onChange={handleChange("userName")} className="admin-field__control" placeholder="nguyenvana.admin" />
                    {fieldErrors.userName ? <span className="admin-field__error">{fieldErrors.userName}</span> : null}
                  </label>

                  <label className="admin-field">
                    <span className="admin-field__label">Password</span>
                    <ShieldCheck size={18} className="admin-field__icon" />
                    <input type="password" value={form.password} onChange={handleChange("password")} className="admin-field__control" placeholder="Nhập mật khẩu ban đầu" />
                    {fieldErrors.password ? <span className="admin-field__error">{fieldErrors.password}</span> : null}
                  </label>

                  <label className="admin-field">
                    <span className="admin-field__label">Role</span>
                    <ShieldCheck size={18} className="admin-field__icon" />
                    <select value={form.roleKey} onChange={handleChange("roleKey")} className="admin-field__control">
                      {roleOptions.map((role) => (
                        <option key={role.key} value={role.key}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.roleKey ? <span className="admin-field__error">{fieldErrors.roleKey}</span> : null}
                  </label>
                </div>

                <div className="mt-4">
                  <AdminBanner
                    title="Các trường liên hệ, MFA và ghi chú chưa có trong API create-user."
                    description="Sau khi backend bổ sung endpoint chi tiết/update user, mình có thể nối tiếp các trường đó vào form admin này."
                    tone="info"
                  />
                </div>

                {submitError ? (
                  <div className="mt-4">
                    <AdminBanner title="Không thể tạo user" description={submitError} tone="warning" />
                  </div>
                ) : null}
              </section>
            </form>

            <div className="flex flex-col gap-6">
              <section className="admin-card">
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Quyền theo role</h2>
                    <p className="admin-card__subtitle">Xem nhanh phần quyền web đang gắn với role đã chọn.</p>
                  </div>
                </div>

                <div className="admin-preview-list">
                  <div className="admin-preview-list__item">
                    <strong>Role được gán</strong>
                    <div className="mt-3">
                      <AdminRoleBadge tone={permissionProfile?.tone}>{permissionProfile?.label}</AdminRoleBadge>
                    </div>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>Phạm vi quyền</strong>
                    <span>{permissionProfile?.shortLabel || "Chưa có thông tin"}</span>
                    <span>{permissionProfile?.permissions ? `${Object.values(permissionProfile.permissions).flatMap(Object.values).filter(Boolean).length} quyền đang được web hiển thị` : "Role này chưa có dữ liệu quyền tương ứng trên web"}</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>Mô tả role</strong>
                    <span>{permissionProfile?.description}</span>
                  </div>
                </div>
              </section>

              <section className="admin-card">
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Checklist cấp quyền</h2>
                    <p className="admin-card__subtitle">Các bước Admin nên xác nhận trước khi cấp account mới.</p>
                  </div>
                </div>

                <div className="admin-preview-list">
                  <div className="admin-preview-list__item">
                    <strong>1. Xác minh nhu cầu truy cập</strong>
                    <span>Đảm bảo role phản ánh đúng công việc và không cấp thừa quyền so với nhu cầu thật.</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>2. Ghi nhớ giới hạn API</strong>
                    <span>Form này hiện mới lưu được 4 trường mà backend `create-user` đang hỗ trợ.</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>3. Kiểm tra lại role sau khi tạo</strong>
                    <span>Nếu cần đổi role ngay sau đó, Admin có thể vào màn Update User để gán lại bằng API assign-roles.</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
