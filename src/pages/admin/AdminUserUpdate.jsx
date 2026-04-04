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

async function buildAvatarFile(avatarFile, avatarPreview, initials = "") {
  if (avatarFile instanceof File) return avatarFile;

  if (typeof avatarPreview === "string" && avatarPreview.trim()) {
    try {
      const response = await fetch(avatarPreview);
      if (response.ok) {
        const blob = await response.blob();
        const type = blob.type || "image/png";
        const extension = type.split("/")[1] || "png";
        return new File([blob], `avatar.${extension}`, { type });
      }
    } catch {
      // Fall back to generated avatar.
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Không thể tạo ảnh đại diện mặc định.");
  }

  context.fillStyle = "#1f4d3a";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.font = "bold 96px Lexend, 'Be Vietnam Pro', system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const safeInitials = String(initials || "?").trim().slice(0, 2).toUpperCase() || "?";
  context.fillText(safeInitials, canvas.width / 2, canvas.height / 2 + 4);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.92));
  if (!blob) {
    throw new Error("Không thể tạo ảnh đại diện mặc định.");
  }

  return new File([blob], "avatar.png", { type: "image/png" });
}

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
  const [isEnabling, setIsEnabling] = useState(false);
  const roleOptions = useMemo(() => getAdminSupportedRoleOptions(), []);
  const selectRoleOptions = useMemo(() => {
    if (!user?.roleKey || roleOptions.some((role) => role.key === user.roleKey)) {
      return roleOptions;
    }

    return [
      {
        key: user.roleKey,
        label: `${user.roleLabel} (vai trò hiện tại)`,
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
          setError("Không tìm thấy tài khoản để cập nhật.");
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
            "Không tải được thông tin tài khoản. Vui lòng thử lại."
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
      roleKey: normalizedValues.roleKey ? "" : "Vui lòng chọn vai trò để gán.",
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
      const avatarUpload = await buildAvatarFile(
        avatarFile,
        avatarPreview || user?.avatarUrl || "",
        form.fullName || form.userName
      );

      const updatedUser = await AdminUserService.updateUser(id, {
        fullName: normalizedValues.fullName,
        email: normalizedValues.email,
        phoneNumber: normalizedValues.phoneNumber,
        location: normalizedValues.location,
        avatarFile: avatarUpload,
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
          setSubmitNotice("Hồ sơ cơ bản đã được lưu, nhưng chưa gán được vai trò mới.");
          setSubmitNoticeTone("warning");
          setSubmitError(
            getAdminUserErrorMessage(
              roleError,
              "Vai trò hiện tại vẫn được giữ nguyên. Vui lòng thử gán lại."
            )
          );
          return;
        }
      }

      navigate(`/admin/users/${id}`, {
        state: {
          notice:
            normalizedValues.roleKey !== user?.roleKey
              ? `Đã cập nhật hồ sơ và gán lại vai trò cho ${updatedUser.fullName}.`
              : `Đã cập nhật hồ sơ tài khoản ${updatedUser.fullName}.`,
        },
      });
    } catch (err) {
      setSubmitError(
        getAdminUserErrorMessage(
          err,
          "Không thể cập nhật tài khoản. Vui lòng thử lại."
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
      `Bạn có chắc muốn vô hiệu hóa tài khoản của ${user.fullName || user.userName || "tài khoản này"} không?`
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
          notice: `Đã vô hiệu hóa tài khoản ${user.fullName || user.userName}.`,
        },
      });
    } catch (err) {
      setSubmitError(
        getAdminUserErrorMessage(
          err,
          "Không thể vô hiệu hóa tài khoản. Vui lòng thử lại."
        )
      );
    } finally {
      setIsDisabling(false);
    }
  };

  const handleEnableUser = async () => {
    if (!user?.id || user.status === "active" || isEnabling) {
      return;
    }

    const shouldEnable = window.confirm(
      `Bạn có chắc muốn kích hoạt lại tài khoản của ${user.fullName || user.userName || "tài khoản này"} không?`
    );

    if (!shouldEnable) return;

    setIsEnabling(true);

    try {
      await AdminUserService.enableUser(user.id);
      navigate(`/admin/users/${id}`, {
        state: {
          notice: `Đã kích hoạt lại tài khoản ${user.fullName || user.userName}.`,
        },
      });
    } catch (err) {
      setSubmitError(
        getAdminUserErrorMessage(
          err,
          "Không thể kích hoạt lại tài khoản. Vui lòng thử lại."
        )
      );
    } finally {
      setIsEnabling(false);
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
                Cập nhật hồ sơ, ảnh đại diện và vai trò của tài khoản khi cần điều chỉnh quyền truy cập.
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
                  onClick={user.status === "active" ? handleDisableUser : handleEnableUser}
                  disabled={user.status === "active" ? isDisabling : isEnabling}
                >
                  {user.status === "active"
                    ? (isDisabling ? <LoaderCircle size={18} className="animate-spin" /> : null)
                    : (isEnabling ? <LoaderCircle size={18} className="animate-spin" /> : null)}
                  <span>{user.status === "active" ? "Vô hiệu hóa tài khoản" : "Kích hoạt lại tài khoản"}</span>
                </button>
              </div>
            ) : null}
          </div>

          {loading ? (
            <section className="admin-card">
              <div className="admin-state">
                <div className="admin-state__content">
                  <strong>Đang tải hồ sơ tài khoản...</strong>
                  <span>Thông tin đang được đồng bộ từ phần chi tiết của hệ thống cho quản trị viên.</span>
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
                  <strong>Không tìm thấy tài khoản để cập nhật</strong>
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
                      <p className="admin-card__subtitle">Điền đầy đủ hồ sơ liên hệ trước khi lưu. Nếu đổi vai trò, hệ thống sẽ gán lại quyền theo vai trò mới.</p>
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
                      <span className="admin-field__label">Tên đăng nhập</span>
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
                      <span className="admin-field__label">Vai trò đang chọn</span>
                      <ShieldCheck size={18} className="admin-field__icon" />
                      <select value={form.roleKey} onChange={handleChange("roleKey")} className="admin-field__control">
                        <option value="">Chọn vai trò để gán</option>
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
                    title="Màn cập nhật đang đồng bộ trực tiếp với hệ thống."
                    description="Hồ sơ hiện tại được tải từ phần chi tiết quản trị, thông tin cơ bản sẽ được lưu trực tiếp lên hệ thống, và vai trò mới sẽ được gán lại sau khi lưu thành công."
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
                    <h2 className="admin-card__title">Quyền theo vai trò đang chọn</h2>
                    <p className="admin-card__subtitle">Xem nhanh phần quyền hệ thống đang gắn với vai trò mới.</p>
                  </div>
                </div>

                  <div className="admin-preview-list">
                    <div className="admin-preview-list__item">
                      <strong>Vai trò áp dụng</strong>
                      <div className="mt-3">
                        <AdminRoleBadge tone={permissionProfile?.tone}>{permissionProfile?.label}</AdminRoleBadge>
                      </div>
                    </div>
                    <div className="admin-preview-list__item">
                      <strong>Thông tin quyền</strong>
                      <span>{permissionProfile?.shortLabel || "Chưa có thông tin"}</span>
                      <span>{permissionProfile?.description || "Vai trò này chưa có dữ liệu quyền tương ứng trên hệ thống."}</span>
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
                      <strong>Vai trò từ hệ thống hiện tại</strong>
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
