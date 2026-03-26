import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import WorkerLayout from "@/layouts/WorkerLayout";
import { userService } from "@/services/userService";
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

function StatItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
      <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-700/70">
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${value ? "text-slate-900" : "text-slate-400 italic"}`}>
        {value || "Chưa cập nhật"}
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
            <StatItem label="Địa chỉ" value={profile?.location || storedUser?.location || storedUser?.address || ""} />
          </div>
        )}
      </div>
    </Layout>
  );
}
