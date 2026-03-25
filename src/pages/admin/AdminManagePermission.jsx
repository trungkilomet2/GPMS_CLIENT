import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RefreshCcw, Save, Search, ShieldAlert, ShieldCheck, Table2, Users } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { AdminBanner, AdminRoleBadge, AdminStatCard } from "@/pages/admin/adminShared";
import PermissionService from "@/services/PermissionService";
import { getAdminSupportedRoleOptions } from "@/services/AdminUserService";

const METHOD_TONE_MAP = {
  GET: "info",
  POST: "success",
  PUT: "warning",
  PATCH: "primary",
  DELETE: "danger",
};

function normalizeRoles(value = []) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === "object") {
          return String(item.name ?? item.label ?? item.role ?? item.value ?? "").trim();
        }

        return String(item ?? "").trim();
      })
      .filter(Boolean);
  }

  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeRoleIds(value = "") {
  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0);
  }

  return String(value ?? "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function normalizePermissionItem(item = {}) {
  return {
    id: item.id ?? 0,
    controller: String(item.controller ?? "").trim(),
    method: String(item.method ?? "").trim().toUpperCase(),
    action: String(item.action ?? "").trim(),
    roleIds: normalizeRoleIds(item.roleIds),
    roles: normalizeRoles(item.roles),
  };
}

function arraysEqual(left = [], right = []) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function createFallbackRoleOption(roleId, label = "") {
  const trimmedLabel = String(label ?? "").trim();

  return {
    key: `role-${roleId}`,
    roleId,
    label: trimmedLabel || `Role ${roleId}`,
    tone: "info",
    description: trimmedLabel
      ? `Role này được backend trả về với nhãn "${trimmedLabel}".`
      : "Role này được backend trả về nhưng web chưa có metadata riêng.",
  };
}

function formatRoleSummary(roleIds = [], roleNames = [], roleMap = new Map()) {
  if (roleNames.length > 0) return roleNames.join(", ");
  if (roleIds.length > 0) {
    return roleIds.map((roleId) => roleMap.get(roleId)?.label || `Role ${roleId}`).join(", ");
  }
  return "Public";
}

function buildRoleAuthorizeValue(roleIds = []) {
  return [...roleIds].sort((left, right) => left - right).join(",");
}

function getMethodTone(method = "") {
  return METHOD_TONE_MAP[method] || "primary";
}

export default function AdminManagePermission() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRole = searchParams.get("role") || "all";
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [permissions, setPermissions] = useState([]);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [permissionError, setPermissionError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [editingRolesById, setEditingRolesById] = useState({});
  const [savingIds, setSavingIds] = useState({});

  const roleOptions = useMemo(() => {
    const baseOptions = getAdminSupportedRoleOptions();
    const roleMap = new Map(
      baseOptions
        .filter((role) => Number.isInteger(Number(role.roleId)) && Number(role.roleId) > 0)
        .map((role) => [Number(role.roleId), { ...role, roleId: Number(role.roleId) }])
    );

    permissions.forEach((item) => {
      item.roleIds.forEach((roleId, index) => {
        if (!roleMap.has(roleId)) {
          roleMap.set(roleId, createFallbackRoleOption(roleId, item.roles[index] || ""));
        }
      });
    });

    return Array.from(roleMap.values()).sort((left, right) => left.roleId - right.roleId);
  }, [permissions]);

  const roleOptionsById = useMemo(() => {
    return new Map(roleOptions.map((role) => [role.roleId, role]));
  }, [roleOptions]);

  const loadPermissions = async () => {
    try {
      setPermissionLoading(true);
      setPermissionError("");
      const response = await PermissionService.getPermissions();
      const normalizedItems = Array.isArray(response?.data)
        ? response.data.map(normalizePermissionItem)
        : [];

      setPermissions(normalizedItems);
      setEditingRolesById(
        normalizedItems.reduce((map, item) => {
          map[item.id] = item.roleIds;
          return map;
        }, {})
      );
    } catch (error) {
      setPermissions([]);
      setEditingRolesById({});
      setPermissionError(
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Không thể tải danh sách permission từ backend."
      );
    } finally {
      setPermissionLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const selectedRoleMeta = useMemo(() => {
    return roleOptions.find((role) => role.key === selectedRole) || null;
  }, [roleOptions, selectedRole]);

  const filteredPermissions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return permissions.filter((item) => {
      if (selectedRole !== "all" && selectedRoleMeta) {
        const roleNames = item.roles.map((role) => role.toLowerCase());
        const hasSelectedRole =
          item.roleIds.includes(selectedRoleMeta.roleId) ||
          roleNames.includes(selectedRoleMeta.key.toLowerCase());

        if (!hasSelectedRole) return false;
      }

      if (methodFilter !== "all" && item.method !== methodFilter) {
        return false;
      }

      if (!keyword) return true;

        const searchableText = [
        item.controller,
        item.action,
        item.method,
        formatRoleSummary(item.roleIds, item.roles, roleOptionsById),
        buildRoleAuthorizeValue(item.roleIds),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [methodFilter, permissions, search, selectedRole, selectedRoleMeta]);

  const controllerCount = useMemo(() => {
    return new Set(filteredPermissions.map((item) => item.controller).filter(Boolean)).size;
  }, [filteredPermissions]);

  const publicPermissionCount = useMemo(() => {
    return permissions.filter((item) => item.roleIds.length === 0 && item.roles.length === 0).length;
  }, [permissions]);

  const roleCards = useMemo(() => {
    return roleOptions.map((role) => ({
      ...role,
      count: permissions.filter((item) => item.roleIds.includes(role.roleId)).length,
    }));
  }, [permissions, roleOptions]);

  const methodOptions = useMemo(() => {
    return ["all", ...new Set(permissions.map((item) => item.method).filter(Boolean))];
  }, [permissions]);

  const handleRoleChange = (roleKey) => {
    const next = new URLSearchParams(searchParams);
    if (!roleKey || roleKey === "all") {
      next.delete("role");
    } else {
      next.set("role", roleKey);
    }
    setSearchParams(next);
  };

  const handleToggleRole = (permissionId, roleId) => {
    setSaveError("");
    setSaveSuccess("");
    setEditingRolesById((current) => {
      const nextRoleIds = new Set(current[permissionId] ?? []);

      if (nextRoleIds.has(roleId)) {
        nextRoleIds.delete(roleId);
      } else {
        nextRoleIds.add(roleId);
      }

      return {
        ...current,
        [permissionId]: Array.from(nextRoleIds).sort((left, right) => left - right),
      };
    });
  };

  const handleResetRow = (permission) => {
    setSaveError("");
    setSaveSuccess("");
    setEditingRolesById((current) => ({
      ...current,
      [permission.id]: permission.roleIds,
    }));
  };

  const handleSaveRow = async (permission) => {
    const nextRoleIds = editingRolesById[permission.id] ?? [];

    try {
      setSaveError("");
      setSaveSuccess("");
      setSavingIds((current) => ({ ...current, [permission.id]: true }));
      await PermissionService.updatePermission(permission.id, nextRoleIds.join(","));

      setPermissions((current) =>
        current.map((item) =>
          item.id === permission.id
            ? {
                ...item,
                roleIds: nextRoleIds,
                roles: nextRoleIds.map((roleId) => roleOptionsById.get(roleId)?.label || `Role ${roleId}`),
              }
            : item
        )
      );

      setSaveSuccess(`Đã cập nhật quyền cho ${permission.controller}.${permission.action}.`);
    } catch (error) {
      setSaveError(
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        `Không thể cập nhật permission #${permission.id}.`
      );
    } finally {
      setSavingIds((current) => ({ ...current, [permission.id]: false }));
    }
  };

  return (
    <DashboardLayout>
      <div className="admin-page">
        <div className="admin-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="admin-hero">
            <div className="admin-hero__heading">
              <h1 className="admin-hero__title">Quản lý permission</h1>
              <p className="admin-hero__subtitle">
                Màn này đọc trực tiếp từ backend `GET /api/Permission` và cho phép cập nhật `roleAuthorize`
                cho từng action bằng `PUT /api/Permission/{"{id}"}`.
              </p>
            </div>

            <div className="admin-hero__actions">
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-focusable"
                onClick={loadPermissions}
                disabled={permissionLoading}
              >
                <RefreshCcw size={18} />
                Làm mới quyền
              </button>
              <Link to="/admin/users" className="admin-btn admin-btn--primary admin-focusable">
                Mở Quản lý user
              </Link>
            </div>
          </div>

          <AdminBanner
            title={
              permissionLoading
                ? "Đang tải permission từ backend."
                : permissions.length > 0
                  ? `Đã tải ${permissions.length} permission từ backend.`
                  : "API Permission đang chạy nhưng chưa có dữ liệu."
            }
            description={
              saveError ||
              saveSuccess ||
              permissionError ||
              (permissions.length > 0
                ? "Bạn có thể bật hoặc tắt role cho từng action rồi lưu riêng từng dòng."
                : "Khi backend trả dữ liệu, bảng permission sẽ hiển thị ngay tại đây.")
            }
            tone={permissionError || saveError ? "danger" : saveSuccess || permissions.length > 0 ? "success" : "warning"}
          />

          <div className="admin-stats-grid">
            <AdminStatCard
              icon={ShieldCheck}
              label="Tổng permission"
              value={permissionLoading ? "..." : permissions.length}
              meta="Tổng số action backend đang expose"
              tone="primary"
            />
            <AdminStatCard
              icon={Table2}
              label="Controller"
              value={permissionLoading ? "..." : controllerCount}
              meta="Số controller trong bộ lọc hiện tại"
              tone="success"
            />
            <AdminStatCard
              icon={Users}
              label="Role filter"
              value={permissionLoading ? "..." : filteredPermissions.length}
              meta={
                selectedRoleMeta
                  ? `Số permission có role ${selectedRoleMeta.label}`
                  : "Số permission trong danh sách hiện tại"
              }
              tone="info"
            />
            <AdminStatCard
              icon={ShieldAlert}
              label="Public"
              value={permissionLoading ? "..." : publicPermissionCount}
              meta="Các action không yêu cầu role"
              tone={publicPermissionCount > 0 ? "warning" : "danger"}
            />
          </div>

          <div className="admin-role-grid">
            <button
              type="button"
              className={`admin-role-card admin-focusable ${selectedRole === "all" ? "is-active" : ""}`}
              onClick={() => handleRoleChange("all")}
            >
              <AdminRoleBadge tone="primary">Tất cả</AdminRoleBadge>
              <strong className="mt-3">Toàn bộ permission</strong>
              <span>Hiển thị tất cả action backend đang trả về.</span>
              <div className="admin-role-card__meta">
                <span>{permissions.length} action</span>
              </div>
            </button>

            {roleCards.map((role) => (
              <button
                key={role.key}
                type="button"
                className={`admin-role-card admin-focusable ${selectedRole === role.key ? "is-active" : ""}`}
                onClick={() => handleRoleChange(role.key)}
              >
                <AdminRoleBadge tone={role.tone}>{role.label}</AdminRoleBadge>
                <strong className="mt-3">{role.label}</strong>
                <span>{role.description}</span>
                <div className="admin-role-card__meta">
                  <span>{role.count} permission</span>
                </div>
              </button>
            ))}
          </div>

          <div className="admin-filter-card">
            <div className="admin-filter-grid admin-filter-grid--permission">
              <label className="admin-field">
                <span className="admin-field__label">Tìm permission</span>
                <Search size={18} className="admin-field__icon" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Controller, action, method, role..."
                  className="admin-field__control"
                />
              </label>

              <label className="admin-field">
                <span className="admin-field__label">Method</span>
                <Table2 size={18} className="admin-field__icon" />
                <select
                  value={methodFilter}
                  onChange={(event) => setMethodFilter(event.target.value)}
                  className="admin-field__control"
                >
                  {methodOptions.map((method) => (
                    <option key={method} value={method}>
                      {method === "all" ? "Tất cả method" : method}
                    </option>
                  ))}
                </select>
              </label>

              <div className="admin-filter-actions">
                <div className="admin-filter-info">
                  <ShieldCheck size={16} />
                  <span>{filteredPermissions.length} permission</span>
                </div>
                <button
                  type="button"
                  className="admin-filter-reset admin-focusable"
                  onClick={() => {
                    setSearch("");
                    setMethodFilter("all");
                    handleRoleChange("all");
                  }}
                >
                  Xóa bộ lọc
                </button>
              </div>
            </div>
          </div>

          <section className="admin-table-card">
              <div className="admin-table-card__header">
                <div>
                  <h2 className="admin-card__title">Danh sách permission</h2>
                  <p className="admin-card__subtitle">
                    {selectedRoleMeta
                      ? `Đang lọc theo role ${selectedRoleMeta.label}, dữ liệu lấy từ API Permission.`
                      : "Mỗi dòng tương ứng một action backend và chuỗi roleAuthorize sẽ được lưu riêng."}
                  </p>
                </div>
              </div>

              <div className="admin-permission-list">
                {!permissionLoading && filteredPermissions.length === 0 ? (
                  <div className="admin-note-box admin-permission-list__empty">
                    <strong>Không có permission phù hợp</strong>
                    <p>Bộ lọc hiện tại chưa khớp với dữ liệu backend trả về.</p>
                  </div>
                ) : (
                  filteredPermissions.map((permission) => {
                    const draftRoleIds = editingRolesById[permission.id] ?? permission.roleIds;
                    const isDirty = !arraysEqual(draftRoleIds, permission.roleIds);
                    const isSaving = Boolean(savingIds[permission.id]);
                    const currentRoleSummary = formatRoleSummary(permission.roleIds, permission.roles, roleOptionsById);
                    const draftRoleSummary = formatRoleSummary(draftRoleIds, [], roleOptionsById);
                    const methodTone = getMethodTone(permission.method);

                    return (
                      <article key={permission.id} className="admin-permission-item">
                        <div className="admin-permission-item__top">
                          <div className="admin-permission-item__identity">
                            <div className="admin-permission-item__meta">
                              <span className="admin-permission-item__code">#{permission.id}</span>
                              <AdminRoleBadge tone={methodTone}>{permission.method || "N/A"}</AdminRoleBadge>
                            </div>

                            <div className="admin-permission-item__heading">
                              <div className="admin-table__primary">{permission.controller}.{permission.action}</div>
                              <div className="admin-table__secondary">
                                Endpoint backend cho controller <strong>{permission.controller || "N/A"}</strong> va action{" "}
                                <strong>{permission.action || "N/A"}</strong>.
                              </div>
                              <div className="admin-permission-item__path">
                                {permission.method || "METHOD"} /api/{permission.controller}/{permission.action}
                              </div>
                            </div>
                          </div>

                          <div className="admin-permission-item__summary">
                            <div className="admin-permission-item__summary-stack">
                              <AdminRoleBadge tone={permission.roleIds.length > 0 ? "primary" : "warning"}>
                                {permission.roleIds.length > 0 ? `${permission.roleIds.length} role hiện tại` : "Public"}
                              </AdminRoleBadge>
                              <AdminRoleBadge tone={isDirty ? "warning" : "success"}>
                                {isDirty ? "Có thay đổi chưa lưu" : "Đã đồng bộ"}
                              </AdminRoleBadge>
                            </div>
                          </div>
                        </div>

                        <div className="admin-permission-item__body">
                          <section className="admin-permission-panel admin-permission-panel--current">
                            <strong className="admin-permission-panel__title">Role hiện tại</strong>
                            <div className="admin-permission-panel__summary">{currentRoleSummary}</div>
                            <div className="admin-permission-table__badges">
                              {permission.roleIds.length > 0 ? (
                                permission.roleIds.map((roleId) => {
                                  const roleMeta = roleOptionsById.get(roleId);
                                  return (
                                    <AdminRoleBadge key={`${permission.id}-current-${roleId}`} tone={roleMeta?.tone || "info"}>
                                      {roleMeta?.label || `Role ${roleId}`}
                                    </AdminRoleBadge>
                                  );
                                })
                              ) : (
                                <AdminRoleBadge tone="warning">Public</AdminRoleBadge>
                              )}
                            </div>
                            <div className="admin-table__secondary">
                              {permission.roleIds.length > 0
                                ? `roleAuthorize hiện tại: "${buildRoleAuthorizeValue(permission.roleIds)}"`
                                : 'roleAuthorize hiện tại: ""'}
                            </div>
                          </section>

                          <section className="admin-permission-panel admin-permission-panel--draft">
                            <strong className="admin-permission-panel__title">Role cập nhật</strong>
                            <div className="admin-permission-panel__summary">{draftRoleSummary}</div>
                            <div className="admin-permission-table__roles">
                              {roleOptions.map((role) => (
                                <label key={`${permission.id}-${role.roleId}`} className="admin-permission-check">
                                  <input
                                    type="checkbox"
                                    checked={draftRoleIds.includes(role.roleId)}
                                    onChange={() => handleToggleRole(permission.id, role.roleId)}
                                    disabled={isSaving}
                                  />
                                  <span>{role.label}</span>
                                </label>
                              ))}
                            </div>
                            <div className="admin-table__secondary admin-permission-table__draft">
                              {buildRoleAuthorizeValue(draftRoleIds)
                                ? `roleAuthorize sẽ lưu: "${buildRoleAuthorizeValue(draftRoleIds)}"`
                                : 'roleAuthorize sẽ lưu: ""'}
                            </div>
                          </section>

                          <section className="admin-permission-panel admin-permission-panel--actions">
                            <strong className="admin-permission-panel__title">Thao tác</strong>
                            <div className="admin-table__actions admin-permission-table__actions">
                              <button
                                type="button"
                                className="admin-link-btn admin-link-btn--secondary"
                                onClick={() => handleResetRow(permission)}
                                disabled={!isDirty || isSaving}
                              >
                                Reset
                              </button>
                              <button
                                type="button"
                                className="admin-link-btn admin-link-btn--primary"
                                onClick={() => handleSaveRow(permission)}
                                disabled={!isDirty || isSaving}
                              >
                                <Save size={16} />
                                {isSaving ? "Đang lưu" : "Lưu roleAuthorize"}
                              </button>
                            </div>
                          </section>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
