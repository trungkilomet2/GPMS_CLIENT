import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  getAdminRoleOptions,
  getAdminUserById,
  getPermissionProfile,
  updateAdminUser,
} from "@/lib/admin/adminMockStore";
import {
  AdminBanner,
  AdminRoleBadge,
  buildAdminUserFormValues,
  sanitizeAdminUserForm,
  validateAdminUserForm,
} from "@/pages/admin/adminShared";

export default function AdminUserUpdate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useMemo(() => getAdminUserById(id), [id]);
  const [form, setForm] = useState(() => buildAdminUserFormValues(user || {}));
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
    setFieldErrors(errors);

    if (!isValid) {
      setSubmitError("Vui lòng kiểm tra lại các trường bắt buộc trước khi lưu.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    const updatedUser = updateAdminUser(id, sanitizeAdminUserForm(values));

    navigate(`/admin/users/${updatedUser.id}`, {
      state: {
        notice: `Đã cập nhật hồ sơ user ${updatedUser.fullName}.`,
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="admin-page">
        <div className="admin-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="admin-hero">
            <div className="admin-hero__heading">
              <Link to={user ? `/admin/users/${user.id}` : "/admin/users"} className="admin-hero__back">
                <ArrowLeft size={18} />
                <span>Quay lại chi tiết user</span>
              </Link>
              <h1 className="admin-hero__title">Update User Screen</h1>
              <p className="admin-hero__subtitle">
                Màn chỉnh sửa để Admin cập nhật role, trạng thái truy cập, thông tin liên hệ và ghi chú kiểm soát cho user hiện có.
              </p>
            </div>

            {user ? (
              <div className="admin-hero__actions">
                <Link to={`/admin/users/${user.id}`} className="admin-btn admin-btn--secondary">
                  Hủy
                </Link>
                <button
                  type="submit"
                  form="admin-user-update-form"
                  className="admin-btn admin-btn--primary admin-focusable"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <LoaderCircle size={18} className="animate-spin" /> : null}
                  <span>{isSubmitting ? "Đang lưu..." : "Save Changes"}</span>
                </button>
              </div>
            ) : null}
          </div>

          {!user ? (
            <section className="admin-card">
              <div className="admin-state">
                <div className="admin-state__content">
                  <strong>Không tìm thấy user để cập nhật</strong>
                  <span>Kiểm tra lại id hoặc quay về danh sách user để chọn hồ sơ cần chỉnh sửa.</span>
                </div>
                <div className="admin-state__actions">
                  <Link to="/admin/users" className="admin-btn admin-btn--primary">
                    Quay lại danh sách
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            <div className="admin-grid admin-grid--form">
              <form id="admin-user-update-form" className="flex flex-col gap-6" onSubmit={handleSubmit}>
                <section className="admin-card">
                  <div className="admin-card__header">
                    <div>
                      <h2 className="admin-card__title">Thông tin user hiện tại</h2>
                      <p className="admin-card__subtitle">Admin có thể cập nhật role, trạng thái và thông tin vận hành, riêng username được giữ cố định.</p>
                    </div>
                  </div>

                  <div className="admin-form-grid">
                    <label className="admin-field">
                      <span className="admin-field__label">Họ và tên</span>
                      <UserRoundCog size={18} className="admin-field__icon" />
                      <input value={form.fullName} onChange={handleChange("fullName")} className="admin-field__control" />
                      {fieldErrors.fullName ? <span className="admin-field__error">{fieldErrors.fullName}</span> : null}
                    </label>

                    <label className="admin-field">
                      <span className="admin-field__label">Username</span>
                      <UserRound size={18} className="admin-field__icon" />
                      <input value={form.userName} disabled className="admin-field__control" />
                    </label>

                    <label className="admin-field">
                      <span className="admin-field__label">Email</span>
                      <Mail size={18} className="admin-field__icon" />
                      <input value={form.email} onChange={handleChange("email")} className="admin-field__control" />
                      {fieldErrors.email ? <span className="admin-field__error">{fieldErrors.email}</span> : null}
                    </label>

                    <label className="admin-field">
                      <span className="admin-field__label">Số điện thoại</span>
                      <Phone size={18} className="admin-field__icon" />
                      <input value={form.phoneNumber} onChange={handleChange("phoneNumber")} className="admin-field__control" />
                      {fieldErrors.phoneNumber ? <span className="admin-field__error">{fieldErrors.phoneNumber}</span> : null}
                    </label>

                    <label className="admin-field">
                      <span className="admin-field__label">Bộ phận</span>
                      <Building2 size={18} className="admin-field__icon" />
                      <input value={form.department} onChange={handleChange("department")} className="admin-field__control" />
                      {fieldErrors.department ? <span className="admin-field__error">{fieldErrors.department}</span> : null}
                    </label>

                    <label className="admin-field">
                      <span className="admin-field__label">Chức danh</span>
                      <BriefcaseBusiness size={18} className="admin-field__icon" />
                      <input value={form.title} onChange={handleChange("title")} className="admin-field__control" />
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
                    </label>

                    <label className="admin-field">
                      <span className="admin-field__label">Trạng thái</span>
                      <KeyRound size={18} className="admin-field__icon" />
                      <select value={form.status} onChange={handleChange("status")} className="admin-field__control">
                        <option value="active">Đang hoạt động</option>
                        <option value="invited">Chờ kích hoạt</option>
                        <option value="suspended">Tạm khóa</option>
                        <option value="locked">Khóa bảo mật</option>
                      </select>
                    </label>

                    <label className="admin-field admin-field--full">
                      <span className="admin-field__label">Khu vực làm việc</span>
                      <MapPin size={18} className="admin-field__icon" />
                      <input value={form.location} onChange={handleChange("location")} className="admin-field__control" />
                    </label>

                    <label className="admin-field admin-field--full">
                      <span className="admin-field__label">Ghi chú kiểm soát</span>
                      <UserRoundCog size={18} className="admin-field__icon" />
                      <textarea value={form.notes} onChange={handleChange("notes")} className="admin-field__control" />
                    </label>
                  </div>

                  <div className="mt-4">
                    <label className="admin-checkbox-card">
                      <input type="checkbox" checked={form.twoFactorEnabled} onChange={handleChange("twoFactorEnabled")} />
                      <div>
                        <strong>Duy trì xác thực đa lớp</strong>
                        <span>Giữ bật cho account có quyền xem log, phân quyền hoặc thực hiện thao tác approve.</span>
                      </div>
                    </label>
                  </div>

                  {submitError ? (
                    <div className="mt-4">
                      <AdminBanner title="Chưa thể lưu thay đổi" description={submitError} tone="warning" />
                    </div>
                  ) : null}
                </section>
              </form>

              <div className="flex flex-col gap-6">
                <section className="admin-card">
                  <div className="admin-card__header">
                    <div>
                      <h2 className="admin-card__title">Role impact preview</h2>
                      <p className="admin-card__subtitle">Xem trước phạm vi quyền mới trước khi lưu thay đổi.</p>
                    </div>
                  </div>

                  <div className="admin-preview-list">
                    <div className="admin-preview-list__item">
                      <strong>Role áp dụng</strong>
                      <div className="mt-3">
                        <AdminRoleBadge tone={permissionProfile?.tone}>{permissionProfile?.label}</AdminRoleBadge>
                      </div>
                    </div>
                    <div className="admin-preview-list__item">
                      <strong>Permission preview</strong>
                      <span>{permissionProfile?.shortLabel}</span>
                      <span>{permissionProfile?.description}</span>
                    </div>
                  </div>
                </section>

                <section className="admin-card">
                  <div className="admin-card__header">
                    <div>
                      <h2 className="admin-card__title">Checklist cập nhật</h2>
                      <p className="admin-card__subtitle">Những điểm Admin nên xác nhận trước khi save.</p>
                    </div>
                  </div>

                  <div className="admin-preview-list">
                    <div className="admin-preview-list__item">
                      <strong>Role mới có cần phê duyệt không?</strong>
                      <span>Nếu thay đổi từ Support/PM sang Admin hoặc Owner, nên kiểm tra lại lý do cấp quyền.</span>
                    </div>
                    <div className="admin-preview-list__item">
                      <strong>Trạng thái account</strong>
                      <span>Locked và Suspended nên luôn đi kèm ghi chú vận hành hoặc lý do kiểm soát.</span>
                    </div>
                    <div className="admin-preview-list__item">
                      <strong>MFA</strong>
                      <span>Không nên tắt MFA nếu user có quyền System Logs hoặc Permissions.</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
