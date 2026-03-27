import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BriefcaseBusiness,
  CircleAlert,
  KeyRound,
  LoaderCircle,
  Plus,
  Search,
  ShieldAlert,
  UserRoundCheck,
  Users,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { ADMIN_STATUS_META } from "@/lib/admin/adminMockStore";
import AdminUserService, { getAdminUserErrorMessage } from "@/services/AdminUserService";
import {
  AdminBanner,
  AdminRoleBadge,
  AdminStatCard,
  AdminStatusBadge,
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
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [noticeTone, setNoticeTone] = useState(location.state?.notice ? "success" : "info");
  const [disablingId, setDisablingId] = useState(null);
  const [reloadSeed, setReloadSeed] = useState(0);

  useEffect(() => {
    if (location.state?.notice) {
      setNotice(location.state.notice);
      setNoticeTone("success");
    }
  }, [location.state]);

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
            "Không tải được danh sách user admin. Vui lòng thử lại."
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

  const roleOptions = useMemo(() => {
    const optionsMap = new Map();

    users.forEach((user) => {
      if (user.roleKey) {
        optionsMap.set(user.roleKey, user.roleLabel);
      }
    });

    const nextOptions = [
      { value: "all", label: "Tất cả role" },
      ...Array.from(optionsMap.entries())
        .sort(([, leftLabel], [, rightLabel]) => leftLabel.localeCompare(rightLabel, "vi"))
        .map(([value, label]) => ({ value, label })),
    ];

    return nextOptions;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const keyword = normalizeSearchText(search);

    return users.filter((user) => {
      const searchableText = normalizeSearchText(
        [
          user.fullName,
          user.userName,
          user.email,
          user.phoneNumber,
          user.location,
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
    const inactive = users.filter((user) => user.status !== "active").length;
    const workers = users.filter((user) => user.roleKey === "Worker").length;

    return { total, active, privileged, inactive, workers };
  }, [users]);

  const hasActiveFilters = Boolean(search.trim()) || roleFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  const handleRetry = () => {
    setReloadSeed((current) => current + 1);
  };

  const handleDisableUser = async (user) => {
    if (!user?.id || user.status === "inactive" || disablingId === user.id) {
      return;
    }

    const shouldDisable = window.confirm(
      `Bạn có chắc muốn vô hiệu hóa tài khoản của ${user.fullName || user.userName || "user này"} không?`
    );

    if (!shouldDisable) return;

    setDisablingId(user.id);
    setNotice("");

    try {
      const response = await AdminUserService.disableUser(user.id);
      if (response?.currentUserSignedOut) {
        return;
      }

      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? { ...item, status: "inactive", statusId: 2 }
            : item
        )
      );
      setNotice(`Đã vô hiệu hóa user ${user.fullName || user.userName}.`);
      setNoticeTone("success");
    } catch (err) {
      setNotice(
        getAdminUserErrorMessage(
          err,
          "Không thể vô hiệu hóa user. Vui lòng thử lại."
        )
      );
      setNoticeTone("warning");
    } finally {
      setDisablingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="admin-page">
        <div className="admin-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="admin-hero">
            <div className="admin-hero__heading">
              <h1 className="admin-hero__title">Quản lý tài khoản</h1>
              <p className="admin-hero__subtitle">
                Rà soát dữ liệu user mà backend đang trả về, nhận diện chỗ nào đã đủ dùng và chỗ nào còn thiếu để quản trị ổn định.
              </p>
            </div>

            <div className="admin-hero__actions">
              <Link to="/admin/users/create" className="admin-btn admin-btn--primary">
                <Plus size={18} />
                <span>Tạo tài khoản</span>
              </Link>
            </div>
          </div>

          {notice ? (
            <AdminBanner
              title={notice}
              description="Thông báo này áp dụng cho dữ liệu vừa thao tác trên màn quản trị."
              tone={noticeTone}
            />
          ) : null}

          <div className="admin-stats-grid">
            <AdminStatCard icon={Users} label="Tổng tài khoản" value={stats.total} meta="Danh sách backend trả về" tone="primary" />
            <AdminStatCard icon={UserRoundCheck} label="Đang hoạt động" value={stats.active} meta="Có thể đăng nhập và sử dụng hệ thống" tone="success" />
            <AdminStatCard icon={KeyRound} label="Vai trò nhạy cảm" value={stats.privileged} meta="Admin và Owner cần được rà soát định kỳ" tone="warning" />
            <AdminStatCard icon={ShieldAlert} label="Tài khoản bị khóa" value={stats.inactive} meta={`${stats.workers} tài khoản worker`} tone="danger" />
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
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
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
                <h2 className="admin-card__title">Danh sách tài khoản</h2>
                <p className="admin-card__subtitle">
                  Tập trung vào thông tin đủ để tìm, xem chi tiết, chỉnh sửa và khóa tài khoản nhanh.
                </p>
              </div>
              <div className="admin-inline-summary">
                <span className="admin-inline-summary__item">{filteredUsers.length} kết quả</span>
                <span className="admin-inline-summary__item">{stats.active} đang hoạt động</span>
              </div>
            </div>

            <div className="admin-table-wrap">
              {loading ? (
                <div className="admin-state">
                  <div className="admin-state__content">
                    <strong>Đang tải danh sách user...</strong>
                    <span>Dữ liệu admin đang được đồng bộ từ backend.</span>
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
              ) : filteredUsers.length === 0 ? (
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
                      <th>Tài khoản</th>
                      <th>Vai trò</th>
                      <th>Trạng thái</th>
                      <th>Đồng bộ</th>
                      <th className="text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
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
                              <div className="admin-table__secondary admin-table__stacked-meta">
                                {user.email || "Chưa cập nhật email"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="admin-chips">
                            <AdminRoleBadge tone={user.roleTone}>{user.roleLabel}</AdminRoleBadge>
                          </div>
                          <div className="admin-table__secondary">
                            {user.roleNames?.join(", ") || user.roleLabel}
                          </div>
                        </td>
                        <td>
                          <div className="admin-chips">
                            <AdminStatusBadge status={user.status} />
                          </div>
                        </td>
                        <td>
                          <div className="admin-table__primary">ID: {user.id ?? "Chưa có"}</div>
                          <div className="admin-table__secondary">
                            {user.statusName || (user.status === "active" ? "Active" : "Inactive")}
                          </div>
                          <div className="admin-table__secondary admin-table__stacked-meta">
                            {[user.phoneNumber, user.location].filter(Boolean).join(" · ") || "Chưa có số điện thoại hoặc địa điểm"}
                          </div>
                        </td>
                        <td>
                          <div className="admin-table__actions">
                            <Link to={`/admin/users/${user.id}`} className="admin-link-btn admin-link-btn--primary">
                              Xem
                            </Link>
                            <Link to={`/admin/users/${user.id}/edit`} className="admin-link-btn admin-link-btn--secondary">
                              Sửa
                            </Link>
                            <button
                              type="button"
                              className="admin-link-btn admin-link-btn--secondary"
                              onClick={() => handleDisableUser(user)}
                              disabled={user.status === "inactive" || disablingId === user.id}
                            >
                              {disablingId === user.id
                                ? "Đang khóa..."
                                : user.status === "inactive"
                                  ? "Đã khóa"
                                  : "Khóa"}
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
