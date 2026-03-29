import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ShieldAlert, ShieldCheck, Users } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { AdminBanner, AdminRoleBadge, AdminStatCard } from "@/pages/admin/adminShared";
import PermissionService, { getPermissionErrorMessage } from "@/services/PermissionService";
import { getAdminSupportedRoleOptions } from "@/services/AdminUserService";

function normalizeSearchText(value = "") {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export default function AdminManagePermission() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [permissionCount, setPermissionCount] = useState(0);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [permissionError, setPermissionError] = useState("");
  const [backendRoles, setBackendRoles] = useState([]);
  const [backendPermissions, setBackendPermissions] = useState([]);
  const [auditCount, setAuditCount] = useState(0);
  const fallbackRoleOptions = useMemo(() => getAdminSupportedRoleOptions(), []);
  const roleOptions = useMemo(() => {
    if (backendRoles.length > 0) {
      return backendRoles.map((role) => {
        const meta = fallbackRoleOptions.find((item) => normalizeSearchText(item.key) === normalizeSearchText(role.name));
        return {
          key: role.name,
          label: meta?.label || role.name,
          shortLabel: meta?.shortLabel || role.name,
          tone: meta?.tone || "info",
        };
      });
    }

    return fallbackRoleOptions;
  }, [backendRoles, fallbackRoleOptions]);
  const selectedRole = searchParams.get("role") || roleOptions[0]?.key || "Admin";
  const activeRole = roleOptions.find((role) => normalizeSearchText(role.key) === normalizeSearchText(selectedRole));
  const activeBackendPermissions = useMemo(() => {
    return backendPermissions.filter((permission) =>
      permission.roles.some((role) => normalizeSearchText(role.name) === normalizeSearchText(selectedRole))
    );
  }, [backendPermissions, selectedRole]);

  const roleCoverageText = useMemo(() => {
    if (permissionLoading) return "Đang tải dữ liệu phân quyền từ backend.";
    if (permissionError) return permissionError;
    if (permissionCount > 0) return `Đã nhận ${permissionCount} permission và ${auditCount} bản ghi lịch sử thay đổi.`;
    return "Chưa có dữ liệu permission từ backend.";
  }, [auditCount, permissionCount, permissionError, permissionLoading]);

  const handleRoleChange = (roleKey) => {
    const next = new URLSearchParams(searchParams);
    next.set("role", roleKey);
    setSearchParams(next);
  };

  useEffect(() => {
    let active = true;

    const loadPermissions = async () => {
      try {
        setPermissionLoading(true);
        setPermissionError("");
        const [permissionResult, roleResult, auditResult] = await Promise.allSettled([
          PermissionService.getPermissions(),
          PermissionService.getRoles(),
          PermissionService.getAuditLogs({ PageIndex: 0, PageSize: 20 }),
        ]);

        if (!active) return;

        if (permissionResult.status === "fulfilled") {
          setBackendPermissions(Array.isArray(permissionResult.value?.data) ? permissionResult.value.data : []);
          setPermissionCount(Array.isArray(permissionResult.value?.data) ? permissionResult.value.data.length : 0);
        } else {
          setBackendPermissions([]);
          setPermissionCount(0);
          setPermissionError(getPermissionErrorMessage(permissionResult.reason, "Không thể tải permission từ backend."));
        }

        if (roleResult.status === "fulfilled") {
          setBackendRoles(Array.isArray(roleResult.value?.data) ? roleResult.value.data : []);
        } else {
          setBackendRoles([]);
        }

        if (auditResult.status === "fulfilled") {
          setAuditCount(Array.isArray(auditResult.value?.data) ? auditResult.value.data.length : 0);
        } else {
          setAuditCount(0);
        }
      } finally {
        if (active) setPermissionLoading(false);
      }
    };

    loadPermissions();

    return () => {
      active = false;
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="admin-page">
        <div className="admin-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="admin-hero">
            <div className="admin-hero__heading">
              <h1 className="admin-hero__title">Phân quyền hệ thống</h1>
              <p className="admin-hero__subtitle">Danh sách role, permission và lịch sử thay đổi theo dữ liệu backend hiện có.</p>
            </div>

            <div className="admin-hero__actions">
              <Link to="/admin/users" className="admin-btn admin-btn--secondary admin-focusable">
                Mở quản lý user
              </Link>
              <Link to="/admin/logs" className="admin-btn admin-btn--primary admin-focusable">
                Mở nhật ký hệ thống
              </Link>
            </div>
          </div>

          <AdminBanner
            title={permissionLoading ? "Đang tải phân quyền." : permissionCount > 0 ? `Đã nhận ${permissionCount} permission.` : "Chưa có dữ liệu phân quyền."}
            description={roleCoverageText}
            tone={permissionError ? "danger" : permissionCount > 0 ? "success" : "warning"}
          />

          <div className="admin-stats-grid">
            <AdminStatCard icon={ShieldCheck} label="Số role" value={roleOptions.length} meta="Danh sách role đang dùng trên màn phân quyền" tone="primary" />
            <AdminStatCard icon={ShieldAlert} label="Permission" value={permissionLoading ? "..." : permissionCount} meta="Số permission backend trả về" tone="success" />
            <AdminStatCard icon={Users} label="Audit log" value={permissionLoading ? "..." : auditCount} meta="Lịch sử thay đổi phân quyền" tone="info" />
            <AdminStatCard icon={ShieldAlert} label="Vai trò đang xem" value={selectedRole} meta="Lọc permission theo role đang chọn" tone="warning" />
          </div>

          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2 className="admin-card__title">Chọn vai trò</h2>
                <p className="admin-card__subtitle">Chọn role để xem permission backend đang gán.</p>
              </div>
            </div>

            <div className="admin-role-grid">
              {roleOptions.map((role) => (
                <button
                  key={role.key}
                  type="button"
                  className={`admin-role-card admin-focusable ${selectedRole === role.key ? "is-active" : ""}`}
                  onClick={() => handleRoleChange(role.key)}
                >
                  <AdminRoleBadge tone={role.tone}>{role.label}</AdminRoleBadge>
                  <strong className="mt-3">{role.shortLabel}</strong>
                  <span>
                    {
                      backendPermissions.filter((permission) =>
                        permission.roles.some((item) => normalizeSearchText(item.name) === normalizeSearchText(role.key))
                      ).length
                    } permission
                  </span>
                </button>
              ))}
            </div>
          </section>

          {!permissionLoading && !permissionError && activeBackendPermissions.length > 0 ? (
            <section className="admin-card">
              <div className="admin-card__header">
                <div>
                  <h2 className="admin-card__title">Permission của {activeRole?.label || selectedRole}</h2>
                  <p className="admin-card__subtitle">Danh sách permission backend đang gán cho vai trò này.</p>
                </div>
              </div>

              <div className="admin-permission-list">
                {activeBackendPermissions.map((permission) => (
                  <div key={permission.id} className="admin-permission-item">
                    <div className="admin-permission-item__top">
                      <div className="admin-permission-item__identity">
                        <div className="admin-permission-item__heading">{permission.controller}.{permission.action}</div>
                        <div className="admin-permission-item__code">{permission.method} / {permission.controller}</div>
                      </div>
                        <div className="admin-chips">
                          {permission.roles.map((role) => (
                          <span key={`${permission.id}-${role.id ?? role.name}`} className="admin-badge admin-badge--tone-info">
                            {role.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {!permissionLoading && !permissionError && activeBackendPermissions.length === 0 ? (
            <section className="admin-card">
              <div className="admin-state">
                <div className="admin-state__content">
                  <strong>Chưa có permission cho vai trò này</strong>
                  <span>
                    Role {activeRole?.label || selectedRole} hiện chưa được backend trả permission nào, hoặc dữ liệu role-permission vẫn chưa được cấu hình.
                  </span>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
}
