import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BriefcaseBusiness,
  KeyRound,
  Plus,
  Search,
  ShieldAlert,
  UserRoundCheck,
  Users,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { ADMIN_STATUS_META, getAdminRoleOptions, getAdminUsers } from "@/lib/admin/adminMockStore";
import {
  AdminBanner,
  AdminRoleBadge,
  AdminStatCard,
  AdminStatusBadge,
  formatAdminDateTime,
  getAdminInitials,
} from "@/pages/admin/adminShared";

function normalizeSearchText(value = "") {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export default function AdminUserList() {
  const [users] = useState(() => getAdminUsers());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const roleOptions = useMemo(() => getAdminRoleOptions(), []);

  const filteredUsers = useMemo(() => {
    const keyword = normalizeSearchText(search);

    return users.filter((user) => {
      const searchableText = normalizeSearchText(
        [
          user.fullName,
          user.userName,
          user.email,
          user.phoneNumber,
          user.department,
          user.title,
          user.roleLabel,
        ]
          .filter(Boolean)
          .join(" ")
      );

      const matchesSearch = !keyword || searchableText.includes(keyword);
      const matchesRole = roleFilter === "all" || user.roleKey === roleFilter;
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [roleFilter, search, statusFilter, users]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((user) => user.status === "active").length;
    const privileged = users.filter((user) => ["Admin", "Owner"].includes(user.roleKey)).length;
    const atRisk = users.filter((user) => ["locked", "suspended"].includes(user.status)).length;
    const withMfa = users.filter((user) => user.twoFactorEnabled).length;

    return { total, active, privileged, atRisk, withMfa };
  }, [users]);

  const hasActiveFilters = Boolean(search.trim()) || roleFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  return (
    <DashboardLayout>
      <div className="admin-page">
        <div className="admin-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="admin-hero">
            <div className="admin-hero__heading">
              <h1 className="admin-hero__title">View User List Screen</h1>
              <p className="admin-hero__subtitle">
                Màn quản trị tập trung để Admin rà soát tài khoản, trạng thái truy cập, role và mức độ rủi ro của từng user.
              </p>
            </div>

            <div className="admin-hero__actions">
              <Link to="/admin/users/create" className="admin-btn admin-btn--primary">
                <Plus size={18} />
                <span>Add New User</span>
              </Link>
            </div>
          </div>

          <AdminBanner
            title="Bộ màn admin này đang chạy bằng dữ liệu demo trên web."
            description="Tạo user, cập nhật user và lưu permission sẽ được giữ trong localStorage để bạn review flow thiết kế ngay trên trình duyệt."
            tone="info"
          />

          <div className="admin-stats-grid">
            <AdminStatCard icon={Users} label="Tổng user" value={stats.total} meta="Tất cả account nội bộ đang quản trị" tone="primary" />
            <AdminStatCard icon={UserRoundCheck} label="Đang hoạt động" value={stats.active} meta="Account có thể đăng nhập ngay" tone="success" />
            <AdminStatCard icon={KeyRound} label="Role đặc quyền" value={stats.privileged} meta={`${stats.withMfa} user đã bật MFA`} tone="warning" />
            <AdminStatCard icon={ShieldAlert} label="Cần xử lý" value={stats.atRisk} meta="User bị khóa hoặc tạm suspend" tone="danger" />
          </div>

          <div className="admin-filter-card">
            <div className="admin-filter-grid">
              <label className="admin-field">
                <span className="admin-field__label">Tìm kiếm user</span>
                <Search size={18} className="admin-field__icon" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tên, username, email, bộ phận..."
                  className="admin-field__control"
                />
              </label>

              <label className="admin-field">
                <span className="admin-field__label">Role</span>
                <BriefcaseBusiness size={18} className="admin-field__icon" />
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="admin-field__control"
                >
                  <option value="all">Tất cả role</option>
                  {roleOptions.map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span className="admin-field__label">Trạng thái</span>
                <ShieldAlert size={18} className="admin-field__icon" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="admin-field__control"
                >
                  <option value="all">Tất cả trạng thái</option>
                  {Object.entries(ADMIN_STATUS_META).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="admin-filter-actions">
                <div className="admin-filter-info">
                  <Users size={16} />
                  <span>{filteredUsers.length} kết quả</span>
                </div>
                {hasActiveFilters ? (
                  <button type="button" className="admin-filter-reset admin-focusable" onClick={clearFilters}>
                    Xóa bộ lọc
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="admin-table-card">
            <div className="admin-table-card__header">
              <div>
                <h2 className="admin-card__title">Danh sách user quản trị</h2>
                <p className="admin-card__subtitle">
                  Ưu tiên hiển thị những account mới cập nhật hoặc có cảnh báo truy cập gần đây.
                </p>
              </div>
            </div>

            <div className="admin-table-wrap">
              {filteredUsers.length === 0 ? (
                <div className="admin-state">
                  <div className="admin-state__content">
                    <strong>Không có user nào phù hợp với bộ lọc hiện tại</strong>
                    <span>Thử nới điều kiện tìm kiếm hoặc xóa bộ lọc để quay lại danh sách đầy đủ.</span>
                  </div>
                  <div className="admin-state__actions">
                    <button type="button" className="admin-btn admin-btn--secondary admin-focusable" onClick={clearFilters}>
                      Xóa bộ lọc
                    </button>
                  </div>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Thông tin liên hệ</th>
                      <th>Role & quyền</th>
                      <th>Trạng thái</th>
                      <th>Lần truy cập cuối</th>
                      <th className="text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="admin-table__user">
                            <div className="admin-avatar">{getAdminInitials(user.fullName)}</div>
                            <div>
                              <div className="admin-table__primary">{user.fullName}</div>
                              <div className="admin-table__secondary">@{user.userName}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="admin-table__primary">{user.email}</div>
                          <div className="admin-table__secondary">
                            {user.phoneNumber} · {user.department}
                          </div>
                        </td>
                        <td>
                          <div className="admin-chips">
                            <AdminRoleBadge tone={user.roleTone}>{user.roleLabel}</AdminRoleBadge>
                            <span className="admin-badge admin-badge--tone-info">{user.grantedPermissionCount} quyền bật</span>
                          </div>
                          <div className="admin-table__secondary">{user.title}</div>
                        </td>
                        <td>
                          <div className="admin-chips">
                            <AdminStatusBadge status={user.status} />
                            {user.twoFactorEnabled ? (
                              <span className="admin-badge admin-badge--tone-success">MFA</span>
                            ) : (
                              <span className="admin-badge admin-badge--tone-warning">Chưa bật MFA</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="admin-table__primary">{formatAdminDateTime(user.lastLogin)}</div>
                          <div className="admin-table__secondary">Cập nhật {formatAdminDateTime(user.updatedAt)}</div>
                        </td>
                        <td>
                          <div className="admin-table__actions">
                            <Link to={`/admin/users/${user.id}`} className="admin-link-btn admin-link-btn--primary">
                              View Detail
                            </Link>
                            <Link to={`/admin/users/${user.id}/edit`} className="admin-link-btn admin-link-btn--secondary">
                              Update User
                            </Link>
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
