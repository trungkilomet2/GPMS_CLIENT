import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import WorkerLayout from "@/layouts/WorkerLayout";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import WorkerService from "@/services/WorkerService";
import LeaveService from "@/services/LeaveService";
import { getStoredUser } from "@/lib/authStorage";
import { getPostLoginPath } from "@/lib/authRouting";
import { getPrimaryWorkspaceRole, splitRoles } from "@/lib/internalRoleFlow";

function getRoleLabel(roleValue) {
  const roles = splitRoles(roleValue);
  if (!roles.length) return "Chưa cập nhật";
  return roles.join(", ");
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

function ChangePasswordCard() {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [show, setShow] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleShow = (field) => {
    setShow((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const getErrorMessage = (error) => {
    const data = error?.response?.data;
    if (typeof data === "string" && data.trim()) return data.trim();
    if (typeof data?.message === "string" && data.message.trim()) return data.message.trim();
    if (typeof data?.title === "string" && data.title.trim()) return data.title.trim();

    const errors = data?.errors;
    if (errors && typeof errors === "object") {
      const firstEntry = Object.values(errors).find((value) => Array.isArray(value) && value.length > 0);
      if (firstEntry) return String(firstEntry[0]);
    }

    return "Không thể đổi mật khẩu lúc này. Vui lòng thử lại.";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.currentPassword.trim()) {
      setMessage({ ok: false, text: "Vui lòng nhập mật khẩu hiện tại." });
      return;
    }

    if (form.newPassword.length < 6) {
      setMessage({ ok: false, text: "Mật khẩu mới phải có ít nhất 6 ký tự." });
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setMessage({ ok: false, text: "Xác nhận mật khẩu mới chưa khớp." });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);
      await authService.changePassword(form);
      setMessage({ ok: true, text: "Đổi mật khẩu thành công." });
      setExpanded(true);
      setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setMessage({ ok: false, text: getErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    {
      name: "currentPassword",
      label: "Mật khẩu hiện tại",
      placeholder: "Nhập mật khẩu hiện tại",
      hint: "Dùng để xác minh bạn là chủ tài khoản.",
    },
    {
      name: "newPassword",
      label: "Mật khẩu mới",
      placeholder: "Nhập mật khẩu mới",
      hint: "Nên dùng ít nhất 6 ký tự.",
    },
    {
      name: "confirmPassword",
      label: "Xác nhận mật khẩu mới",
      placeholder: "Nhập lại mật khẩu mới",
      hint: "Nhập lại chính xác mật khẩu mới.",
    },
  ];

  return (
    <div className="rounded-[28px] border border-emerald-100/70 bg-white/80 p-6 shadow-[0_18px_40px_rgba(30,110,67,0.10)] backdrop-blur">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-4 text-left transition hover:bg-emerald-50"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Đổi mật khẩu
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Mở khi bạn cần cập nhật mật khẩu đăng nhập.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-bold text-emerald-800 sm:block">
            {expanded ? "Thu gọn" : "Mở"}
          </span>
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-800 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          >
            ˅
          </span>
        </div>
      </button>

      {message ? (
        <div
          className={`mt-5 rounded-2xl px-4 py-3 text-sm font-semibold ${
            message.ok
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          expanded ? "mt-6 max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
      <div className="mx-auto max-w-3xl rounded-[24px] border border-emerald-100 bg-white/90 p-5 shadow-sm">
      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-1">
        {fields.map((field, index) => (
          <label
            key={field.name}
            className="block"
          >
            <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700/70">
              {field.label}
            </span>
            <div className="relative">
              <input
                type={show[field.name] ? "text" : "password"}
                name={field.name}
                value={form[field.name]}
                onChange={handleChange}
                placeholder={field.placeholder}
                disabled={submitting}
                className="w-full rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 pr-14 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
              />
              <button
                type="button"
                onClick={() => toggleShow(field.name)}
                disabled={submitting}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-base text-slate-500 transition hover:bg-white hover:text-emerald-700 disabled:cursor-not-allowed"
                aria-label={show[field.name] ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {show[field.name] ? "🙈" : "👁"}
              </button>
            </div>
            <span className="mt-2 block text-xs text-slate-500">{field.hint}</span>
          </label>
        ))}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-w-[220px] items-center justify-center rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white shadow-[0_16px_30px_rgba(30,110,67,0.18)] transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-400"
          >
            {submitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
          </button>
        </div>
      </form>
      </div>
      </div>
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

    if (primaryRole !== "owner" && primaryRole !== "pm") {
      setOverview(null);
      setOverviewLoading(false);
      return undefined;
    }

    let mounted = true;

    const loadOverview = async () => {
      setOverviewLoading(true);

      try {
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
  const showManagementOverview = primaryRole === "owner" || primaryRole === "pm";
  const overviewCards = useMemo(() => {
    if (!overview || !showManagementOverview) return [];

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
                    : "Thông tin nhanh về nhân viên bạn đang phụ trách và các việc cần theo dõi."}
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
          <div className="flex flex-col gap-6">
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
            <ChangePasswordCard />
          </div>
        )}
      </div>
    </Layout>
  );
}
