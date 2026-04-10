import { createElement } from "react";
import "@/styles/admin.css";

export const ADMIN_STATUS_META = {
  active: { label: "Đang hoạt động" },
  invited: { label: "Đã mời" },
  inactive: { label: "Đã vô hiệu hóa" },
  locked: { label: "Đã khóa" },
  suspended: { label: "Tạm ngưng" },
};

export const ADMIN_LOG_SEVERITY_META = {
  info: { label: "Thông tin", tone: "info" },
  success: { label: "Thành công", tone: "success" },
  warning: { label: "Cảnh báo", tone: "warning" },
  danger: { label: "Lỗi", tone: "danger" },
};

export const ADMIN_LOG_OUTCOME_META = {
  success: { label: "Thành công", tone: "success" },
  warning: { label: "Cần kiểm tra", tone: "warning" },
  failure: { label: "Thất bại", tone: "danger" },
};

export function countGrantedPermissions(profile) {
  if (!profile) return 0;

  if (Number.isFinite(Number(profile.permissionCount))) {
    return Number(profile.permissionCount);
  }

  const permissions = profile.permissions;
  if (!permissions || typeof permissions !== "object") {
    return 0;
  }

  return Object.values(permissions)
    .flatMap((group) => (group && typeof group === "object" ? Object.values(group) : []))
    .filter(Boolean).length;
}

export function getAdminInitials(name = "") {
  return name
    .split(" ")
    .map((item) => item[0])
    .filter(Boolean)
    .slice(-2)
    .join("")
    .toUpperCase();
}

export function formatAdminDateTime(value, includeTime = true) {
  if (!value) return "Chưa cập nhật";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";

  return new Intl.DateTimeFormat("vi-VN", includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(date);
}

export function buildAdminUserFormValues(user = {}) {
  return {
    fullName: user.fullName || "",
    userName: user.userName || "",
    email: user.email || "",
    phoneNumber: user.phoneNumber || "",
    department: user.department || "",
    title: user.title || "",
    roleKey: user.roleKey || "PM",
    status: user.status || "invited",
    twoFactorEnabled: user.twoFactorEnabled ?? true,
    location: user.location || "",
    notes: user.notes || "",
  };
}

export function sanitizeAdminUserForm(form) {
  const normalizeSpace = (value = "") => String(value).trim().replace(/\s+/g, " ");

  return {
    ...form,
    fullName: normalizeSpace(form.fullName),
    userName: String(form.userName || "").trim().toLowerCase(),
    email: String(form.email || "").trim().toLowerCase(),
    phoneNumber: normalizeSpace(form.phoneNumber),
    department: normalizeSpace(form.department),
    title: normalizeSpace(form.title),
    location: normalizeSpace(form.location),
    notes: String(form.notes || "").trim(),
  };
}

export function validateAdminUserForm(rawForm) {
  const form = sanitizeAdminUserForm(rawForm);
  const nextErrors = {
    fullName: form.fullName ? "" : "Vui lòng nhập họ và tên.",
    userName: form.userName ? "" : "Vui lòng nhập tên đăng nhập.",
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
      ? ""
      : "Email chưa đúng định dạng.",
    phoneNumber: form.phoneNumber ? "" : "Vui lòng nhập số điện thoại.",
    department: form.department ? "" : "Vui lòng nhập bộ phận.",
    title: form.title ? "" : "Vui lòng nhập chức danh.",
    roleKey: form.roleKey ? "" : "Vui lòng chọn vai trò.",
    status: form.status ? "" : "Vui lòng chọn trạng thái.",
  };

  return {
    values: form,
    errors: nextErrors,
    isValid: !Object.values(nextErrors).some(Boolean),
  };
}

export function AdminStatCard({ icon: Icon, label, value, meta, tone = "primary" }) {
  return (
    <div className={`admin-stat admin-stat--${tone}`}>
      <div className="admin-stat__top">
        <div>
          <p className="admin-stat__label">{label}</p>
          <div className="admin-stat__value">{value}</div>
        </div>
        <div className="admin-stat__icon">
          {createElement(Icon, { size: 20 })}
        </div>
      </div>
      <p className="admin-stat__meta">{meta}</p>
    </div>
  );
}

export function AdminBanner({ title, description, tone = "info" }) {
  return (
    <div className={`admin-banner admin-banner--${tone}`}>
      <div>
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
      </div>
    </div>
  );
}

export function AdminStatusBadge({ status, label }) {
  const meta = ADMIN_STATUS_META[status] || ADMIN_STATUS_META.active;

  return (
    <span className={`admin-badge admin-badge--${status}`}>
      {label || meta.label}
    </span>
  );
}

export function AdminSeverityBadge({ severity }) {
  const meta = ADMIN_LOG_SEVERITY_META[severity] || ADMIN_LOG_SEVERITY_META.info;

  return (
    <span className={`admin-badge admin-badge--tone-${meta.tone}`}>
      {meta.label}
    </span>
  );
}

export function AdminOutcomeBadge({ outcome }) {
  const meta = ADMIN_LOG_OUTCOME_META[outcome] || ADMIN_LOG_OUTCOME_META.success;

  return (
    <span className={`admin-badge admin-badge--tone-${meta.tone}`}>
      {meta.label}
    </span>
  );
}

export function AdminRoleBadge({ tone = "primary", children }) {
  return (
    <span className={`admin-badge admin-badge--tone-${tone}`}>
      {children}
    </span>
  );
}

export function AdminPermissionSummary({ profile }) {
  if (!profile) return "Chưa gán quyền";
  return `${countGrantedPermissions(profile)} quyền đang bật`;
}

export function getAdminPermissionSummaryText(profile) {
  if (!profile) return "Chưa gán quyền";
  return `${countGrantedPermissions(profile)} quyền đang bật`;
}
