import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  KeyRound,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  UserRoundCog,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  createAdminUser,
  getAdminRoleOptions,
  getAdminUsers,
  getPermissionProfile,
} from "@/lib/admin/adminMockStore";
import {
  AdminBanner,
  AdminRoleBadge,
  buildAdminUserFormValues,
  sanitizeAdminUserForm,
  validateAdminUserForm,
} from "@/pages/admin/adminShared";

export default function AdminUserCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => buildAdminUserFormValues());
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleOptions = useMemo(() => getAdminRoleOptions(), []);
  const permissionProfile = useMemo(() => getPermissionProfile(form.roleKey), [form.roleKey]);

  const handleChange = (field) => (event) => {
    const value = field === "twoFactorEnabled" ? event.target.checked : event.target.value;
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setFieldErrors((current) => ({
      ...current,
      [field]: "",
    }));
    setSubmitError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const { values, errors, isValid } = validateAdminUserForm(form);
    const normalizedValues = sanitizeAdminUserForm(values);

    if (getAdminUsers().some((user) => user.userName === normalizedValues.userName)) {
      errors.userName = "Username này đã tồn tại trong dữ liệu demo.";
    }

    setFieldErrors(errors);

    if (!isValid || Object.values(errors).some(Boolean)) {
      setSubmitError("Vui lòng kiểm tra lại thông tin trước khi tạo user.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    const createdUser = createAdminUser(normalizedValues);

    navigate(`/admin/users/${createdUser.id}`, {
      state: {
        notice: `Đã tạo user ${createdUser.fullName} thành công trong admin module.`,
      },
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
                Form onboarding cho Admin tạo account nội bộ mới, gán role, bật MFA và kiểm tra phạm vi truy cập trước khi cấp quyền.
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
                    <p className="admin-card__subtitle">Nhập các thông tin nhận diện chính của user nội bộ.</p>
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
                    <span className="admin-field__label">Email</span>
                    <Mail size={18} className="admin-field__icon" />
                    <input value={form.email} onChange={handleChange("email")} className="admin-field__control" placeholder="user@gpms.vn" />
                    {fieldErrors.email ? <span className="admin-field__error">{fieldErrors.email}</span> : null}
                  </label>

                  <label className="admin-field">
                    <span className="admin-field__label">Số điện thoại</span>
                    <Phone size={18} className="admin-field__icon" />
                    <input value={form.phoneNumber} onChange={handleChange("phoneNumber")} className="admin-field__control" placeholder="09xx xxx xxx" />
                    {fieldErrors.phoneNumber ? <span className="admin-field__error">{fieldErrors.phoneNumber}</span> : null}
                  </label>

                  <label className="admin-field">
                    <span className="admin-field__label">Bộ phận</span>
                    <Building2 size={18} className="admin-field__icon" />
                    <input value={form.department} onChange={handleChange("department")} className="admin-field__control" placeholder="Nền tảng vận hành" />
                    {fieldErrors.department ? <span className="admin-field__error">{fieldErrors.department}</span> : null}
                  </label>

                  <label className="admin-field">
                    <span className="admin-field__label">Chức danh</span>
                    <BriefcaseBusiness size={18} className="admin-field__icon" />
                    <input value={form.title} onChange={handleChange("title")} className="admin-field__control" placeholder="System Administrator" />
                    {fieldErrors.title ? <span className="admin-field__error">{fieldErrors.title}</span> : null}
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

                  <label className="admin-field">
                    <span className="admin-field__label">Trạng thái</span>
                    <KeyRound size={18} className="admin-field__icon" />
                    <select value={form.status} onChange={handleChange("status")} className="admin-field__control">
                      <option value="invited">Chờ kích hoạt</option>
                      <option value="active">Đang hoạt động</option>
                      <option value="suspended">Tạm khóa</option>
                      <option value="locked">Khóa bảo mật</option>
                    </select>
                    {fieldErrors.status ? <span className="admin-field__error">{fieldErrors.status}</span> : null}
                  </label>

                  <label className="admin-field admin-field--full">
                    <span className="admin-field__label">Khu vực làm việc</span>
                    <MapPin size={18} className="admin-field__icon" />
                    <input value={form.location} onChange={handleChange("location")} className="admin-field__control" placeholder="Hà Nội / TP. Hồ Chí Minh / Đà Nẵng..." />
                  </label>

                  <label className="admin-field admin-field--full">
                    <span className="admin-field__label">Ghi chú onboarding</span>
                    <UserRoundCog size={18} className="admin-field__icon" />
                    <textarea value={form.notes} onChange={handleChange("notes")} className="admin-field__control" placeholder="Mô tả phạm vi công việc, deadline kích hoạt, hoặc lưu ý bảo mật..." />
                  </label>
                </div>

                <div className="mt-4">
                  <label className="admin-checkbox-card">
                    <input type="checkbox" checked={form.twoFactorEnabled} onChange={handleChange("twoFactorEnabled")} />
                    <div>
                      <strong>Bật MFA ngay khi tạo account</strong>
                      <span>Khuyến nghị bật với mọi user có quyền truy cập dữ liệu vận hành hoặc phân quyền.</span>
                    </div>
                  </label>
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
                    <h2 className="admin-card__title">Permission preview</h2>
                    <p className="admin-card__subtitle">Xem nhanh quyền mà user sẽ nhận theo role đã chọn.</p>
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
                    <span>{permissionProfile?.shortLabel}</span>
                    <span>{permissionProfile ? `${Object.values(permissionProfile.permissions).flatMap(Object.values).filter(Boolean).length} capability bật` : "Chưa gán quyền"}</span>
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
                    <span>Đảm bảo role phản ánh đúng công việc và không cấp thừa quyền cấu hình.</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>2. Kích hoạt MFA</strong>
                    <span>Ưu tiên bật cho user có quyền xem log, quyền user hoặc quyền approve.</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>3. Gắn ghi chú onboarding</strong>
                    <span>Ghi rõ bộ phận, deadline kích hoạt và đầu mối chịu trách nhiệm.</span>
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
