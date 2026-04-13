import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authService } from "@/services/authService";
import DashboardLayout from "@/layouts/DashboardLayout";
import WorkerLayout from "@/layouts/WorkerLayout";
import { userService } from "@/services/userService";
import WorkerService from "@/services/WorkerService";
import LeaveService from "@/services/LeaveService";
import AdminUserService from "@/services/AdminUserService";
import PermissionService from "@/services/PermissionService";
import LogService from "@/services/LogService";
import { getStoredUser } from "@/lib/authStorage";
import { getPostLoginPath } from "@/lib/authRouting";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";
import { getSystemRoleLabel, pickPrimarySystemRole } from "@/lib/orgHierarchy";
import { getErrorMessage } from "@/utils/errorUtils";

function getRoleLabel(roleValue) {
  const primaryRole = pickPrimarySystemRole(roleValue);
  if (!primaryRole) return "Chưa cập nhật";
  return getSystemRoleLabel(primaryRole);
}

function getInitials(name = "") {
  return String(name || "")
    .split(" ")
    .map((item) => item[0])
    .filter(Boolean)
    .slice(-2)
    .join("")
    .toUpperCase();
}

function StatItem({ label, value, variant = "default" }) {
  const hasValue = Boolean(value);

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
      <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-700/70">
        {label}
      </div>
      {variant === "location" ? (
        <div className="mt-1 text-sm leading-6 text-slate-600">
          {hasValue ? (
            <>
              Khu vực đã chọn: <strong className="font-semibold text-slate-900">{value}</strong>
            </>
          ) : (
            <span className="italic text-slate-400">Chưa cập nhật</span>
          )}
        </div>
      ) : (
        <div className={`mt-1 text-sm font-semibold ${hasValue ? "text-slate-900" : "text-slate-400 italic"}`}>
          {value || "Chưa cập nhật"}
        </div>
      )}
    </div>
  );
}

function OverviewCard({ label, value, meta }) {
  return (
    <div className="rounded-2xl border border-emerald-100/80 bg-white/88 px-4 py-4 shadow-sm">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700/70">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black leading-none text-slate-900">
        {value}
      </div>
      <div className="mt-2 text-sm leading-6 text-slate-500">
        {meta}
      </div>
    </div>
  );
}

function EyeIcon({ open = false }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12C3.8 8.6 7.4 6.5 12 6.5C16.6 6.5 20.2 8.6 22 12C20.2 15.4 16.6 17.5 12 17.5C7.4 17.5 3.8 15.4 2 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      {!open ? (
        <path
          d="M4 20L20 4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}

function validateNewPassword(currentPassword, nextPassword, confirmPassword) {
  if (!currentPassword.trim()) return "Vui lòng nhập mật khẩu hiện tại.";
  if (!nextPassword.trim()) return "Vui lòng nhập mật khẩu mới.";
  if (nextPassword !== confirmPassword) return "Mật khẩu mới và xác nhận mật khẩu chưa khớp.";
  if (nextPassword.length < 8) return "Mật khẩu mới phải có ít nhất 8 ký tự.";
  if (nextPassword === currentPassword) return "Mật khẩu mới phải khác mật khẩu hiện tại.";
  if (!/[A-Z]/.test(nextPassword)) return "Mật khẩu mới cần có ít nhất 1 chữ hoa.";
  if (!/[a-z]/.test(nextPassword)) return "Mật khẩu mới cần có ít nhất 1 chữ thường.";
  if (!/\d/.test(nextPassword)) return "Mật khẩu mới cần có ít nhất 1 chữ số.";
  if (!/[^A-Za-z0-9]/.test(nextPassword)) return "Mật khẩu mới cần có ít nhất 1 ký tự đặc biệt.";
  return "";
}

function SecuritySection() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const validationMessage = validateNewPassword(form.current, form.next, form.confirm);
    if (validationMessage) {
      setMessage({ ok: false, text: validationMessage });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      await authService.changePassword({
        currentPassword: form.current,
        newPassword: form.next,
        confirmPassword: form.confirm,
      });
      setMessage({ ok: true, text: "Đổi mật khẩu thành công!" });
      setForm({ current: "", next: "", confirm: "" });
    } catch (error) {
      setMessage({ ok: false, text: getErrorMessage(error, "Không thể đổi mật khẩu lúc này.") });
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { name: "current", label: "Mật khẩu hiện tại", placeholder: "Nhập mật khẩu hiện tại" },
    { name: "next", label: "Mật khẩu mới", placeholder: "Nhập mật khẩu mới" },
    { name: "confirm", label: "Xác nhận mật khẩu mới", placeholder: "Nhập lại mật khẩu mới" },
  ];

  return (
    <div className="rounded-[28px] border border-emerald-100/70 bg-white/80 p-6 shadow-[0_18px_40px_rgba(30,110,67,0.10)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/70 p-5">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Đổi mật khẩu</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Mở biểu mẫu để cập nhật mật khẩu mới và tăng độ an toàn cho tài khoản của bạn.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setExpanded((prev) => !prev);
            if (expanded) {
              setMessage(null);
              setForm({ current: "", next: "", confirm: "" });
              setShow({ current: false, next: false, confirm: false });
            }
          }}
          className={`rounded-2xl px-5 py-3 text-sm font-extrabold transition ${
            expanded
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "bg-emerald-700 text-white shadow-[0_16px_30px_rgba(30,110,67,0.18)] hover:bg-emerald-800"
          }`}
        >
          {expanded ? "Ẩn đổi mật khẩu" : "Mở đổi mật khẩu"}
        </button>
      </div>

      {expanded ? (
        <div className="mt-5">
          {message ? (
            <div
              className={`mb-4 rounded-2xl px-4 py-3 text-sm font-semibold ${
                message.ok
                  ? "border border-emerald-100 bg-emerald-50 text-emerald-800"
                  : "border border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {message.text}
            </div>
          ) : null}

          <form onSubmit={submit} className="grid max-w-2xl gap-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm leading-6 text-slate-600">
              Mật khẩu mới cần có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
            </div>
            {fields.map((field) => (
              <label key={field.name} className="grid gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700/70">
                  {field.label}
                </span>
                <div className="relative">
                  <input
                    type={show[field.name] ? "text" : "password"}
                    name={field.name}
                    value={form[field.name]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 pr-12 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((prev) => ({ ...prev, [field.name]: !prev[field.name] }))}
                    className="absolute right-4 top-1/2 inline-flex -translate-y-1/2 items-center justify-center text-slate-500"
                    aria-label={show[field.name] ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    <EyeIcon open={show[field.name]} />
                  </button>
                </div>
              </label>
            ))}

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white shadow-[0_16px_30px_rgba(30,110,67,0.18)] transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {saving ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default function InternalProfileView() {
  const navigate = useNavigate();
  const location = useLocation();
  const storedUser = useMemo(() => getStoredUser(), []);
  const Layout = useMemo(() => {
    const primaryRole = getPrimaryWorkspaceRole(storedUser?.role);

    if (primaryRole === "worker") return WorkerLayout;
    return DashboardLayout;
  }, [storedUser]);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const next = await userService.getProfile();
        if (!mounted) return;
        setProfile(next);
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.message || e?.response?.data?.title || "Không thể tải hồ sơ.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    // allow refresh when coming back from edit page
  }, [location?.state?.refresh]);

  useEffect(() => {
    const primaryRole = getPrimaryWorkspaceRole(profile?.role || storedUser?.role);

    if (primaryRole !== "owner" && primaryRole !== "pm" && primaryRole !== "admin") {
      setOverview(null);
      setOverviewLoading(false);
      return undefined;
    }

    let mounted = true;

    const loadOverview = async () => {
      setOverviewLoading(true);

      try {
        if (primaryRole === "admin") {
          const [usersResponse, permissionResponse, logResponse] = await Promise.all([
            AdminUserService.getUsers({ pageSize: 100 }),
            PermissionService.getPermissions(),
            LogService.getAllPages({ pageSize: 50 }),
          ]);

          if (!mounted) return;

          const users = Array.isArray(usersResponse?.data) ? usersResponse.data : [];
          const permissions = Array.isArray(permissionResponse?.data) ? permissionResponse.data : [];
          const logs = Array.isArray(logResponse?.data) ? logResponse.data : [];
          const activeUsers = users.filter((item) => String(item?.status ?? "").toLowerCase() === "active").length;
          const internalRoles = new Set();

          permissions.forEach((permission) => {
            const roles = Array.isArray(permission?.roles) ? permission.roles : [];
            roles.forEach((role) => {
              const roleName = String(role?.name ?? "").trim();
              if (!roleName || roleName === "Customer") return;
              internalRoles.add(roleName);
            });
          });

          const latestLogs = logs.slice(0, 10);
          const recentWarnings = latestLogs.filter((item) => {
            const level = String(item?.level ?? "").toLowerCase();
            return level.includes("warn") || level.includes("error");
          }).length;

          setOverview({
            primaryRole,
            users,
            permissions,
            activeUsers,
            internalRoleCount: internalRoles.size,
            recentWarnings,
            recentLogCount: latestLogs.length,
          });
          return;
        }

        const [employeeResponse, leaveResponse] = await Promise.all([
          primaryRole === "owner"
            ? WorkerService.getEmployeeDirectory({ pageSize: 100 })
            : WorkerService.getEmployeeDirectoryByPmScope({ pageSize: 100 }),
          LeaveService.getLeaveRequests({ PageIndex: 0, PageSize: 100 }),
        ]);

        if (!mounted) return;

        const employees = Array.isArray(employeeResponse?.data) ? employeeResponse.data : [];
        const leaves = Array.isArray(leaveResponse?.data) ? leaveResponse.data : [];
        const pendingLeaves = leaves.filter((item) => item?.status === "pending").length;
        const activeEmployees = employees.filter((item) => item?.status === "active").length;
        const skilledEmployees = employees.filter(
          (item) => Array.isArray(item?.workerSkillNames) && item.workerSkillNames.length > 0
        ).length;
        const pmCount = employees.filter((item) => Array.isArray(item?.roles) && item.roles.includes("PM")).length;

        setOverview({
          primaryRole,
          employees,
          pendingLeaves,
          activeEmployees,
          skilledEmployees,
          pmCount,
        });
      } catch {
        if (!mounted) return;
        setOverview(null);
      } finally {
        if (mounted) setOverviewLoading(false);
      }
    };

    loadOverview();

    return () => {
      mounted = false;
    };
  }, [profile?.role, storedUser?.role]);

  const displayName =
    profile?.fullName ||
    storedUser?.fullName ||
    storedUser?.name ||
    "Người dùng";

  const avatarUrl = profile?.avatarUrl || storedUser?.avatarUrl || "";
  const initials = getInitials(displayName);
  const roleLabel = getRoleLabel(profile?.role || storedUser?.role);
  const userName = storedUser?.userName || storedUser?.username || storedUser?.user || "";
  const homePath = getPostLoginPath(profile?.role || storedUser?.role);
  const primaryRole = getPrimaryWorkspaceRole(profile?.role || storedUser?.role);
  const showManagementOverview = primaryRole === "owner" || primaryRole === "pm" || primaryRole === "admin";
  const overviewCards = useMemo(() => {
    if (!overview || !showManagementOverview) return [];

    if (overview.primaryRole === "admin") {
      return [
        {
          label: "Tài khoản hệ thống",
          value: overview.users.length,
          meta: "Tổng số tài khoản nội bộ đang được theo dõi trong hệ thống.",
        },
        {
          label: "Vai trò nội bộ",
          value: overview.internalRoleCount,
          meta: "Số vai trò đang có dữ liệu quyền từ máy chủ.",
        },
        {
          label: "Đang hoạt động",
          value: overview.activeUsers,
          meta: "Số tài khoản đang có trạng thái hoạt động.",
        },
        {
          label: "Cảnh báo gần đây",
          value: overview.recentWarnings,
          meta: `Theo dõi trên ${overview.recentLogCount || 0} bản ghi nhật ký gần nhất.`,
        },
      ];
    }

    if (overview.primaryRole === "owner") {
      return [
        {
          label: "Tổng nhân sự",
          value: overview.employees.length,
          meta: "Toàn bộ tài khoản nội bộ đang có trong xưởng",
        },
        {
          label: "Quản lý sản xuất",
          value: overview.pmCount,
          meta: "Số quản lý sản xuất đang thuộc phạm vi điều hành",
        },
        {
          label: "Đang hoạt động",
          value: overview.activeEmployees,
          meta: "Nhân sự hiện có trạng thái hoạt động",
        },
        {
          label: "Đơn chờ duyệt",
          value: overview.pendingLeaves,
          meta: "Số đơn nghỉ phép đang chờ xử lý",
        },
      ];
    }

    return [
      {
        label: "Nhân viên phụ trách",
        value: overview.employees.length,
        meta: "Tổng nhân sự đang trực thuộc phạm vi quản lý của bạn",
      },
      {
        label: "Đang hoạt động",
        value: overview.activeEmployees,
        meta: "Nhân viên hiện đang làm việc",
      },
      {
        label: "Có chuyên môn",
        value: overview.skilledEmployees,
        meta: "Nhân sự đã được gán chuyên môn thợ",
      },
      {
        label: "Đơn chờ duyệt",
        value: overview.pendingLeaves,
        meta: "Số đơn nghỉ phép đang chờ bạn theo dõi hoặc xử lý",
      },
    ];
  }, [overview, showManagementOverview]);

  return (
    <Layout>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-emerald-100/70 bg-white/80 p-6 shadow-[0_18px_40px_rgba(30,110,67,0.10)] backdrop-blur">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="h-[76px] w-[76px] rounded-2xl border border-emerald-100 object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-[76px] w-[76px] items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-2xl font-extrabold text-emerald-800">
                  {initials || "GP"}
                </div>
              )}

              <div className="min-w-0">
                <div className="truncate text-2xl font-extrabold tracking-tight text-slate-900">
                  {displayName}
                </div>
                <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">
                  {roleLabel}
                </div>
              </div>
            </div>

            <div className="flex w-full gap-3 sm:w-auto">
              <button
                type="button"
                onClick={() => navigate("/profile/edit")}
                className="flex-1 rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-extrabold text-emerald-800 shadow-sm transition hover:bg-emerald-50 sm:flex-none"
              >
                Chỉnh sửa
              </button>
              <button
                type="button"
                onClick={() => navigate(homePath)}
                className="flex-1 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white shadow-[0_16px_30px_rgba(30,110,67,0.18)] transition hover:bg-emerald-800 sm:flex-none"
              >
                Về dashboard
              </button>
            </div>
          </div>
        </div>

        {showManagementOverview ? (
          <div className="rounded-[28px] border border-emerald-100/70 bg-white/80 p-6 shadow-[0_18px_40px_rgba(30,110,67,0.10)] backdrop-blur">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  Tổng quan quản lý
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {primaryRole === "owner"
                    ? "Thông tin nhanh về nhân sự và các đầu việc điều hành trong xưởng."
                    : primaryRole === "pm"
                      ? "Thông tin nhanh về nhân viên bạn đang phụ trách và các việc cần theo dõi."
                      : "Thông tin nhanh về tài khoản, vai trò và cảnh báo hệ thống gần đây."}
                </p>
              </div>
            </div>

            {overviewLoading ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[118px] animate-pulse rounded-2xl border border-emerald-100 bg-emerald-50/50"
                  />
                ))}
              </div>
            ) : overviewCards.length ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {overviewCards.map((item) => (
                  <OverviewCard
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    meta={item.meta}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm font-medium text-slate-600">
                Chưa lấy được dữ liệu tổng quan quản lý lúc này.
              </div>
            )}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[82px] animate-pulse rounded-2xl border border-emerald-100 bg-white/70"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <StatItem label="Tên đăng nhập" value={userName} />
            <StatItem label="Email" value={profile?.email || storedUser?.email || ""} />
            <StatItem label="Số điện thoại" value={profile?.phoneNumber || storedUser?.phoneNumber || storedUser?.phone || ""} />
            <StatItem
              label="Địa chỉ / Khu vực"
              value={profile?.location || storedUser?.location || storedUser?.address || ""}
              variant="location"
            />
          </div>
        )}

        <SecuritySection />
      </div>
    </Layout>
  );
}
