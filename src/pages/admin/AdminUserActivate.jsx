import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CircleAlert, LoaderCircle, RefreshCcw, UserRoundCheck } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import AdminUserService, { getAdminUserErrorMessage } from "@/services/AdminUserService";
import {
  AdminBanner,
  AdminRoleBadge,
  AdminStatCard,
  AdminStatusBadge,
  formatAdminDateTime,
  getAdminInitials,
} from "@/pages/admin/adminShared";

const ACTIVATABLE_STATUSES = new Set(["inactive", "invited", "suspended", "locked"]);

export default function AdminUserActivate() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState("info");
  const [activatingId, setActivatingId] = useState(null);
  const [reloadSeed, setReloadSeed] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchUsers = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await AdminUserService.getUsers();
        if (!mounted) return;
        setUsers(response?.data ?? []);
      } catch (err) {
        if (!mounted) return;
        setError(
          getAdminUserErrorMessage(
            err,
            "Không tải được danh sách user cần kích hoạt. Vui lòng thử lại."
          )
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchUsers();
    return () => {
      mounted = false;
    };
  }, [reloadSeed]);

  const activatableUsers = useMemo(
    () => users.filter((user) => ACTIVATABLE_STATUSES.has(user.status)),
    [users]
  );

  const stats = useMemo(() => ({
    total: activatableUsers.length,
    inactive: activatableUsers.filter((user) => user.status === "inactive").length,
    suspended: activatableUsers.filter((user) => ["suspended", "locked"].includes(user.status)).length,
  }), [activatableUsers]);

  const handleRetry = () => {
    setReloadSeed((current) => current + 1);
  };

  const handleEnableUser = async (user) => {
    if (!user?.id || !ACTIVATABLE_STATUSES.has(user.status) || activatingId === user.id) {
      return;
    }

    const shouldEnable = window.confirm(
      `Bạn có chắc muốn kích hoạt lại tài khoản của ${user.fullName || user.userName || "user này"} không?`
    );

    if (!shouldEnable) return;

    setActivatingId(user.id);
    setNotice("");

    try {
      await AdminUserService.enableUser(user.id);
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? { ...item, status: "active", statusId: 1 }
            : item
        )
      );
      setNotice(`Đã kích hoạt lại tài khoản ${user.fullName || user.userName}.`);
      setNoticeTone("success");
    } catch (err) {
      setNotice(
        getAdminUserErrorMessage(
          err,
          "Không thể kích hoạt lại tài khoản. Vui lòng thử lại."
        )
      );
      setNoticeTone("warning");
    } finally {
      setActivatingId(null);
    }
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
              <h1 className="admin-hero__title">Kích hoạt tài khoản</h1>
              <p className="admin-hero__subtitle">
                Rà soát các tài khoản đang bị ngừng hoạt động hoặc khóa tạm thời, sau đó kích hoạt lại khi đủ điều kiện sử dụng.
              </p>
            </div>

            <div className="admin-hero__actions">
              <button type="button" className="admin-btn admin-btn--secondary admin-focusable" onClick={handleRetry}>
                <RefreshCcw size={18} />
                <span>Tải lại</span>
              </button>
            </div>
          </div>

          {notice ? (
            <AdminBanner
              title={notice}
              description="Danh sách bên dưới đã được cập nhật lại theo thao tác vừa thực hiện."
              tone={noticeTone}
            />
          ) : null}

          <div className="admin-stats-grid">
            <AdminStatCard icon={UserRoundCheck} label="Có thể kích hoạt" value={stats.total} meta="Bao gồm inactive, suspended, locked, invited" tone="primary" />
            <AdminStatCard icon={UserRoundCheck} label="Ngừng hoạt động" value={stats.inactive} meta="Tài khoản bị disable từ admin" tone="warning" />
            <AdminStatCard icon={CircleAlert} label="Tạm khóa" value={stats.suspended} meta="Cần rà soát trước khi mở lại" tone="danger" />
          </div>

          <div className="admin-table-card">
            <div className="admin-table-card__header">
              <div>
                <h2 className="admin-card__title">Danh sách user chờ kích hoạt</h2>
                <p className="admin-card__subtitle">
                  Chỉ hiển thị các tài khoản chưa ở trạng thái hoạt động để admin xử lý nhanh.
                </p>
              </div>
            </div>

            <div className="admin-table-wrap">
              {loading ? (
                <div className="admin-state">
                  <div className="admin-state__content">
                    <strong>Đang tải danh sách user...</strong>
                    <span>Dữ liệu đang được đồng bộ từ backend.</span>
                  </div>
                  <div className="admin-state__actions">
                    <LoaderCircle size={20} className="animate-spin" />
                  </div>
                </div>
              ) : error ? (
                <div className="admin-state">
                  <div className="admin-state__content">
                    <strong>Không tải được danh sách user</strong>
                    <span>{error}</span>
                  </div>
                  <div className="admin-state__actions">
                    <button type="button" className="admin-btn admin-btn--primary admin-focusable" onClick={handleRetry}>
                      <CircleAlert size={18} />
                      <span>Thử lại</span>
                    </button>
                  </div>
                </div>
              ) : activatableUsers.length === 0 ? (
                <div className="admin-state">
                  <div className="admin-state__content">
                    <strong>Không có tài khoản nào cần kích hoạt</strong>
                    <span>Tất cả tài khoản hiện đã ở trạng thái hoạt động hoặc chưa có dữ liệu phù hợp.</span>
                  </div>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Tài khoản</th>
                      <th>Vai trò</th>
                      <th>Trạng thái</th>
                      <th>Đồng bộ</th>
                      <th className="text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activatableUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="admin-table__user">
                            <div className="admin-avatar">
                              {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full rounded-full object-cover" />
                              ) : (
                                getAdminInitials(user.fullName)
                              )}
                            </div>
                            <div>
                              <div className="admin-table__primary">{user.fullName}</div>
                              <div className="admin-table__secondary">@{user.userName || "chua-co-username"}</div>
                              <div className="admin-table__secondary admin-table__stacked-meta">{user.email || "Chưa cập nhật email"}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="admin-chips">
                            <AdminRoleBadge tone={user.roleTone}>{user.roleLabel}</AdminRoleBadge>
                          </div>
                          <div className="admin-table__secondary">
                            {user.roleDescription || "Chưa có mô tả vai trò từ backend."}
                          </div>
                        </td>
                        <td>
                          <div className="admin-chips">
                            <AdminStatusBadge status={user.status} />
                          </div>
                        </td>
                        <td>
                          <div className="admin-table__primary">{formatAdminDateTime(user.updatedAt || user.createdAt || user.lastLogin)}</div>
                          <div className="admin-table__secondary">ID: {user.id ?? "Chưa có"}</div>
                        </td>
                        <td>
                          <div className="admin-table__actions">
                            <Link to={`/admin/users/${user.id}`} className="admin-link-btn admin-link-btn--secondary">
                              Xem
                            </Link>
                            <button
                              type="button"
                              className="admin-link-btn admin-link-btn--primary"
                              onClick={() => handleEnableUser(user)}
                              disabled={activatingId === user.id}
                            >
                              {activatingId === user.id ? "Đang kích hoạt..." : "Kích hoạt"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
