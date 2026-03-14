import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  KeyRound,
  ShieldCheck,
  ShieldEllipsis,
  Users,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  ADMIN_PERMISSION_ACTIONS,
  ADMIN_PERMISSION_MODULES,
  getAdminRoleOptions,
  getAdminUsers,
  getPermissionProfile,
  getPermissionProfiles,
  updatePermissionProfile,
} from "@/lib/admin/adminMockStore";
import {
  AdminBanner,
  AdminRoleBadge,
  AdminStatCard,
  formatAdminDateTime,
  getAdminInitials,
} from "@/pages/admin/adminShared";

const serializePermissions = (permissions) => JSON.stringify(permissions || {});

export default function AdminManagePermission() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRole = searchParams.get("role") || "Admin";
  const [profiles, setProfiles] = useState(() => getPermissionProfiles());
  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [draftPermissions, setDraftPermissions] = useState(() => getPermissionProfile(initialRole)?.permissions || {});
  const [notice, setNotice] = useState("");

  const roleOptions = useMemo(() => getAdminRoleOptions(), []);
  const allUsers = useMemo(() => getAdminUsers(), []);
  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.key === selectedRole) || profiles[0],
    [profiles, selectedRole]
  );

  useEffect(() => {
    if (activeProfile) {
      setDraftPermissions(activeProfile.permissions);
    }
  }, [activeProfile]);

  const assignedUsers = useMemo(
    () => allUsers.filter((user) => user.roleKey === selectedRole),
    [allUsers, selectedRole]
  );

  const enabledCount = useMemo(() => {
    return ADMIN_PERMISSION_MODULES.reduce((count, moduleItem) => {
      const permissionSet = draftPermissions[moduleItem.key] || {};
      return (
        count +
        ADMIN_PERMISSION_ACTIONS.reduce(
          (actionCount, action) => actionCount + (permissionSet[action.key] ? 1 : 0),
          0
        )
      );
    }, 0);
  }, [draftPermissions]);

  const highRiskCount = useMemo(() => {
    return ADMIN_PERMISSION_MODULES.reduce((count, moduleItem) => {
      const permissionSet = draftPermissions[moduleItem.key] || {};
      return count + (permissionSet.configure ? 1 : 0) + (permissionSet.approve ? 1 : 0);
    }, 0);
  }, [draftPermissions]);

  const hasUnsavedChanges =
    serializePermissions(draftPermissions) !== serializePermissions(activeProfile?.permissions);

  const handleRoleChange = (roleKey) => {
    setSelectedRole(roleKey);
    const next = new URLSearchParams(searchParams);
    next.set("role", roleKey);
    setSearchParams(next);
    setNotice("");
  };

  const togglePermission = (moduleKey, actionKey) => {
    setDraftPermissions((current) => ({
      ...current,
      [moduleKey]: {
        ...(current[moduleKey] || {}),
        [actionKey]: !(current[moduleKey] || {})[actionKey],
      },
    }));
    setNotice("");
  };

  const handleReset = () => {
    setDraftPermissions(activeProfile.permissions);
    setNotice("");
  };

  const handleSave = () => {
    const savedProfile = updatePermissionProfile(selectedRole, draftPermissions);
    setProfiles(getPermissionProfiles());
    setNotice(`Đã lưu thay đổi phân quyền cho role ${savedProfile.label}.`);
  };

  return (
    <DashboardLayout>
      <div className="admin-page">
        <div className="admin-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="admin-hero">
            <div className="admin-hero__heading">
              <h1 className="admin-hero__title">Manage Permission Screen</h1>
              <p className="admin-hero__subtitle">
                Màn ma trận quyền dành cho Admin để cấu hình permission theo role, xem số user bị ảnh hưởng và kiểm soát các capability nhạy cảm.
              </p>
            </div>

            <div className="admin-hero__actions">
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-focusable"
                onClick={handleReset}
                disabled={!hasUnsavedChanges}
              >
                Reset thay đổi
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary admin-focusable"
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
              >
                Save Permission
              </button>
            </div>
          </div>

          {notice ? <AdminBanner title={notice} description="Sự thay đổi này cũng được ghi lại vào màn System Log." tone="success" /> : null}

          <div className="admin-stats-grid">
            <AdminStatCard icon={ShieldCheck} label="Role đang chọn" value={activeProfile?.key || "-"} meta={activeProfile?.label || "Chưa xác định"} tone="primary" />
            <AdminStatCard icon={KeyRound} label="Quyền bật" value={enabledCount} meta="Tổng capability đang được cấp" tone="success" />
            <AdminStatCard icon={ShieldEllipsis} label="Quyền nhạy cảm" value={highRiskCount} meta="Approve + Config đang được mở" tone="warning" />
            <AdminStatCard icon={Users} label="User bị ảnh hưởng" value={assignedUsers.length} meta="Những user đang dùng role này" tone="info" />
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
                <span>{role.description}</span>
                <div className="admin-role-card__meta">
                  <span>Cập nhật gần nhất: {formatAdminDateTime(getPermissionProfile(role.key)?.updatedAt)}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="admin-grid admin-grid--permissions">
            <section className="admin-card">
              <div className="admin-card__header">
                <div>
                  <h2 className="admin-card__title">Permission matrix</h2>
                  <p className="admin-card__subtitle">Bật hoặc tắt capability cho từng module theo role đang chọn.</p>
                </div>
              </div>

              <div className="admin-matrix-wrap">
                <table className="admin-matrix">
                  <thead>
                    <tr>
                      <th>Module</th>
                      {ADMIN_PERMISSION_ACTIONS.map((action) => (
                        <th key={action.key}>{action.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ADMIN_PERMISSION_MODULES.map((moduleItem) => (
                      <tr key={moduleItem.key}>
                        <td className="admin-matrix__module">
                          <strong>{moduleItem.label}</strong>
                          <span>{moduleItem.description}</span>
                        </td>
                        {ADMIN_PERMISSION_ACTIONS.map((action) => (
                          <td key={action.key} className="admin-checkcell">
                            <input
                              type="checkbox"
                              checked={Boolean(draftPermissions[moduleItem.key]?.[action.key])}
                              onChange={() => togglePermission(moduleItem.key, action.key)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="flex flex-col gap-6">
              <section className="admin-card">
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Tác động role</h2>
                    <p className="admin-card__subtitle">Thông tin nhanh để Admin cân nhắc trước khi lưu.</p>
                  </div>
                </div>

                <div className="admin-preview-list">
                  <div className="admin-preview-list__item">
                    <strong>Role hiện tại</strong>
                    <span>{activeProfile?.label}</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>Mô tả quyền</strong>
                    <span>{activeProfile?.description}</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>Trạng thái draft</strong>
                    <span>{hasUnsavedChanges ? "Có thay đổi chưa lưu" : "Đang đồng bộ với cấu hình đã lưu"}</span>
                  </div>
                </div>
              </section>

              <section className="admin-card">
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Users áp dụng role này</h2>
                    <p className="admin-card__subtitle">Tất cả user bên dưới sẽ nhận thay đổi ngay sau khi save.</p>
                  </div>
                </div>

                {assignedUsers.length === 0 ? (
                  <div className="admin-note-box">
                    <strong>Chưa có user nào được gán</strong>
                    <p>Role này hiện chưa có account nào sử dụng trong dataset admin demo.</p>
                  </div>
                ) : (
                  <div className="admin-assignee-list">
                    {assignedUsers.map((user) => (
                      <div key={user.id} className="admin-assignee">
                        <div className="admin-avatar">{getAdminInitials(user.fullName)}</div>
                        <div className="admin-assignee__body">
                          <strong>{user.fullName}</strong>
                          <span>{user.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="admin-card">
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Luồng review</h2>
                    <p className="admin-card__subtitle">Gợi ý để thay đổi quyền không gây side effect ngoài dự kiến.</p>
                  </div>
                </div>

                <div className="admin-preview-list">
                  <div className="admin-preview-list__item">
                    <strong>1. Xác nhận business owner</strong>
                    <span>Những thay đổi mở thêm approve/configure nên có owner xác nhận trước.</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>2. Soát user bị ảnh hưởng</strong>
                    <span>Đặc biệt lưu ý role đang được nhiều user active sử dụng.</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>3. Theo dõi log sau khi save</strong>
                    <span>Chuyển sang màn System Log để xác nhận thay đổi đã được ghi nhận đúng.</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>Shortcut</strong>
                    <span>
                      <Link to="/admin/logs" className="admin-link-btn admin-link-btn--secondary">
                        Mở System Log
                      </Link>
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
