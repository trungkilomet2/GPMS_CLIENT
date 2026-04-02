import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
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
  normalizeSpaces,
  validateAvatarFile,
  validateEmail,
  validateFullName,
  validateLocation,
  validatePhoneNumber,
} from "@/lib/validators";
import AdminUserService, {
  getAdminRoleProfile,
  getAdminSupportedRoleOptions,
  getAdminUserErrorMessage,
} from "@/services/AdminUserService";
import {
  AdminBanner,
  AdminRoleBadge,
  AdminStatusBadge,
  getAdminInitials,
} from "@/pages/admin/adminShared";

export default function AdminUserUpdate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    fullName: "",
    userName: "",
    email: "",
    phoneNumber: "",
    location: "",
    roleKey: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitNotice, setSubmitNotice] = useState("");
  const [submitNoticeTone, setSubmitNoticeTone] = useState("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDisabling, setIsDisabling] = useState(false);
  const roleOptions = useMemo(() => getAdminSupportedRoleOptions(), []);
  const selectRoleOptions = useMemo(() => {
    if (!user?.roleKey || roleOptions.some((role) => role.key === user.roleKey)) {
      return roleOptions;
    }

    return [
      {
        key: user.roleKey,
        label: `${user.roleLabel} (role hiện tại)`,
      },
      ...roleOptions,
    ];
  }, [roleOptions, user]);
  const permissionProfile = useMemo(() => getAdminRoleProfile(form.roleKey), [form.roleKey]);

  useEffect(() => {
    let mounted = true;

    const fetchUser = async () => {
      setLoading(true);
      setError("");

      try {
        const foundUser = await AdminUserService.getUserById(id);
        if (!mounted) return;

        if (!foundUser) {
          setError("Không tìm thấy user để cập nhật.");
          setUser(null);
          return;
        }

        setUser(foundUser);
        setForm({
          fullName: foundUser.fullName || "",
          userName: foundUser.userName || "",
          email: foundUser.email || "",
          phoneNumber: foundUser.phoneNumber || "",
          location: foundUser.location || "",
          roleKey: foundUser.roleKey || "",
        });
        setAvatarPreview(foundUser.avatarUrl || "");
        setAvatarFile(null);
      } catch (err) {
        if (!mounted) return;

        setError(
          getAdminUserErrorMessage(
            err,
            "Không tải được thông tin user. Vui lòng thử lại."
          )
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchUser();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

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
    setSubmitNotice("");
  };

  const handleAvatarChange = (event) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;

    const avatarError = validateAvatarFile(nextFile);
    if (avatarError) {
      setFieldErrors((current) => ({
        ...current,
        avatarFile: avatarError,
      }));
      return;
    }

    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(nextFile);
    setAvatarPreview(URL.createObjectURL(nextFile));
    setFieldErrors((current) => ({
      ...current,
      avatarFile: "",
    }));
    setSubmitError("");
    setSubmitNotice("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedValues = {
      fullName: normalizeSpaces(form.fullName),
      email: String(form.email ?? "").trim().toLowerCase(),
      phoneNumber: String(form.phoneNumber ?? "").trim(),
      location: normalizeSpaces(form.location),
      roleKey: String(form.roleKey ?? "").trim(),
    };

    const errors = {
      fullName: validateFullName(normalizedValues.fullName),
      email: validateEmail(normalizedValues.email),
      phoneNumber: validatePhoneNumber(normalizedValues.phoneNumber),
      location: validateLocation(normalizedValues.location),
      roleKey: normalizedValues.roleKey ? "" : "Vui lòng chọn role để gán.",
      avatarFile: fieldErrors.avatarFile || "",
    };

    setFieldErrors(errors);

    if (Object.values(errors).some(Boolean)) {
      setSubmitNotice("");
      setSubmitError("Vui lòng kiểm tra lại thông tin trước khi lưu.");
      return;
    }

    setIsSubmitting(true);
    setSubmitNotice("");
    setSubmitError("");

    try {
      const updatedUser = await AdminUserService.updateUser(id, {
        fullName: normalizedValues.fullName,
        email: normalizedValues.email,
        phoneNumber: normalizedValues.phoneNumber,
        location: normalizedValues.location,
        avatarFile,
      });

      if (normalizedValues.roleKey !== user?.roleKey) {
        try {
          await AdminUserService.assignRoles(id, [normalizedValues.roleKey]);
        } catch (roleError) {
          setUser((current) => (
            current
              ? {
                  ...current,
                  fullName: updatedUser.fullName ?? current.fullName,
                  userName: updatedUser.userName ?? current.userName,
                  email: updatedUser.email ?? current.email,
                  phoneNumber: updatedUser.phoneNumber ?? current.phoneNumber,
                  location: updatedUser.location ?? current.location,
                  avatarUrl: updatedUser.avatarUrl ?? current.avatarUrl,
                }
              : updatedUser
          ));
          setAvatarFile(null);
          setAvatarPreview(updatedUser.avatarUrl || avatarPreview);
          setSubmitNotice("Hồ sơ cơ bản đã được lưu, nhưng chưa gán được role mới.");
          setSubmitNoticeTone("warning");
          setSubmitError(
            getAdminUserErrorMessage(
              roleError,
              "Role hiện tại vẫn được giữ nguyên. Vui lòng thử gán role lại."
            )
          );
          return;
        }
      }

      navigate(`/admin/users/${id}`, {
        state: {
          notice:
            normalizedValues.roleKey !== user?.roleKey
              ? `Đã cập nhật hồ sơ và gán lại role cho ${updatedUser.fullName}.`
              : `Đã cập nhật hồ sơ user ${updatedUser.fullName}.`,
        },
      });
    } catch (err) {
      setSubmitError(
        getAdminUserErrorMessage(
          err,
          "Không thể cập nhật user. Vui lòng thử lại."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisableUser = async () => {
    if (!user?.id || user.status === "inactive" || isDisabling) {
      return;
    }

    const shouldDisable = window.confirm(
      `Bạn có chắc muốn vô hiệu hóa tài khoản của ${user.fullName || user.userName || "user này"} không?`
    );

    if (!shouldDisable) return;

    setIsDisabling(true);

    try {
      const response = await AdminUserService.disableUser(user.id);
      if (response?.currentUserSignedOut) {
        return;
      }

      navigate(`/admin/users/${id}`, {
        state: {
          notice: `Đã vô hiệu hóa user ${user.fullName || user.userName}.`,
        },
      });
    } catch (err) {
      setSubmitError(
        getAdminUserErrorMessage(
          err,
          "Không thể vô hiệu hóa user. Vui lòng thử lại."
        )
      );
    } finally {
      setIsDisabling(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="admin-page">
        <div className="admin-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="admin-hero">
            <div className="admin-hero__heading">
              <Link to={user ? `/admin/users/${user.id}` : "/admin/users"} className="admin-hero__back">
                <ArrowLeft size={18} />
                <span>Quay lại chi tiết tài khoản</span>
              </Link>
              <h1 className="admin-hero__title">Cập nhật tài khoản</h1>
              <p className="admin-hero__subtitle">
                Cập nhật hồ sơ, ảnh đại diện và vai trò hệ thống của người dùng khi cần điều chỉnh quyền truy cập.
              </p>
            </div>

            {user && !loading ? (
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
                  <span>{isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}</span>
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-focusable"
                  onClick={handleDisableUser}
                  disabled={user.status === "inactive" || isDisabling}
                >
                  {isDisabling ? <LoaderCircle size={18} className="animate-spin" /> : null}
                  <span>{user.status === "inactive" ? "Đã vô hiệu hóa" : "Vô hiệu hóa tài khoản"}</span>
                </button>
              </div>
            ) : null}
          </div>

          {loading ? (
            <section className="admin-card">
              <div className="admin-state">
                <div className="admin-state__content">
                  <strong>Đang tải hồ sơ user...</strong>
                  <span>Thông tin đang được đồng bộ từ endpoint detail cho admin.</span>
                </div>
                <div className="admin-state__actions">
                  <LoaderCircle size={20} className="animate-spin" />
                </div>
              </div>
            </section>
          ) : error ? (
            <section className="admin-card">
              <div className="admin-state">
                <div className="admin-state__content">
                  <strong>Không tìm thấy user để cập nhật</strong>
                  <span>{error}</span>
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
                      <h2 className="admin-card__title">Thông tin tài khoản hiện tại</h2>
                      <p className="admin-card__subtitle">Điền đầy đủ hồ sơ liên hệ trước khi lưu. Nếu đổi vai trò, hệ thống sẽ gán lại quyền theo role mới.</p>
                    </div>
                  </div>

                  <div className="admin-form-grid">
                    <label className="admin-field admin-field--full">
                      <span className="admin-field__label">Ảnh đại diện</span>
                      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="admin-avatar h-20 w-20">
                          {avatarPreview ? (
                            <img src={avatarPreview} alt={form.fullName || form.userName} className="h-full w-full rounded-full object-cover" />
                          ) : (
                            getAdminInitials(form.fullName || form.userName)
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="admin-field__control"
                          />
                          <div className="mt-2 text-sm text-slate-500">
                            Chỉ upload khi bạn muốn thay ảnh mới. Nếu bỏ trống, hệ thống sẽ giữ ảnh hiện tại.
                          </div>
                          {fieldErrors.avatarFile ? <span className="admin-field__error">{fieldErrors.avatarFile}</span> : null}
                        </div>
                      </div>
                    </label>

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
                      <span className="admin-field__label">Role đang chọn</span>
                      <ShieldCheck size={18} className="admin-field__icon" />
                      <select value={form.roleKey} onChange={handleChange("roleKey")} className="admin-field__control">
                        <option value="">Chọn role để gán</option>
                        {selectRoleOptions.map((role) => (
                          <option key={role.key} value={role.key}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.roleKey ? <span className="admin-field__error">{fieldErrors.roleKey}</span> : null}
                    </label>

                    <label className="admin-field">
                      <span className="admin-field__label">Trạng thái hiện tại</span>
                      <ShieldCheck size={18} className="admin-field__icon" />
                      <input value={user.status === "active" ? "Đang hoạt động" : "Đã vô hiệu hóa"} disabled className="admin-field__control" />
                    </label>

                    <label className="admin-field admin-field--full">
                      <span className="admin-field__label">Địa điểm</span>
                      <MapPin size={18} className="admin-field__icon" />
                      <input value={form.location} onChange={handleChange("location")} className="admin-field__control" />
                      {fieldErrors.location ? <span className="admin-field__error">{fieldErrors.location}</span> : null}
                    </label>
                  </div>

                  <div className="mt-4">
                    <AdminBanner
                      title="Màn cập nhật đang đồng bộ trực tiếp với backend."
                      description="Hồ sơ hiện tại được tải từ API admin detail, phần thông tin cơ bản lưu qua API cập nhật, và vai trò mới sẽ được gán lại sau khi lưu thành công."
                      tone="info"
                    />
                  </div>

                  {submitNotice ? (
                    <div className="mt-4">
                      <AdminBanner title={submitNotice} description={submitError} tone={submitNoticeTone} />
                    </div>
                  ) : null}

                  {!submitNotice && submitError ? (
                    <div className="mt-4">
                      <AdminBanner
                        title="Chưa thể lưu thay đổi"
                        description={submitError}
                        tone="warning"
                      />
                    </div>
                  ) : null}
                </section>
              </form>

              <div className="flex flex-col gap-6">
                <section className="admin-card">
                  <div className="admin-card__header">
                    <div>
                      <h2 className="admin-card__title">Quyền theo role đang chọn</h2>
                      <p className="admin-card__subtitle">Xem nhanh phần quyền web sẽ hiển thị theo role mới.</p>
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
                      <strong>Thông tin quyền</strong>
                      <span>{permissionProfile?.shortLabel || "Chưa có thông tin"}</span>
                      <span>{permissionProfile?.description || "Role này chưa có dữ liệu quyền tương ứng trên web."}</span>
                    </div>
                    <div className="admin-preview-list__item">
                      <strong>Chuyên môn thợ hiện tại</strong>
                      <span>{user.workerRole || "Chưa gán chuyên môn thợ"}</span>
                    </div>
                  </div>
                </section>

                <section className="admin-card">
                  <div className="admin-card__header">
                    <div>
                      <h2 className="admin-card__title">Tóm tắt tài khoản</h2>
                      <p className="admin-card__subtitle">Đối chiếu nhanh thông tin trước khi bấm lưu.</p>
                    </div>
                  </div>

                  <div className="admin-preview-list">
                    <div className="admin-preview-list__item">
                      <strong>Trạng thái</strong>
                      <div className="mt-3">
                        <AdminStatusBadge status={user.status} />
                      </div>
                    </div>
                    <div className="admin-preview-list__item">
                      <strong>Role backend hiện tại</strong>
                      <span>{user.roleNames?.join(", ") || user.roleLabel}</span>
                    </div>
                    <div className="admin-preview-list__item">
                      <strong>Lưu ý thao tác</strong>
                      <span>Nếu cần khóa tài khoản, dùng nút Vô hiệu hóa tài khoản. Nếu chỉ sửa hồ sơ, form này sẽ không thay đổi trạng thái hoạt động.</span>
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
