import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RotateCcw, Save, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  AdminBanner,
  AdminRoleBadge,
  AdminStatCard,
  formatAdminDateTime,
} from "@/pages/admin/adminShared";
import PermissionService from "@/services/PermissionService";

const ROLE_META = {
  Admin: { label: "Quản trị hệ thống", shortLabel: "Quản trị hệ thống", description: "Quản lý quyền và tài khoản toàn hệ thống.", tone: "danger" },
  Customer: { label: "Khách hàng", shortLabel: "Khách hàng", description: "Theo dõi đơn hàng và hồ sơ khách hàng.", tone: "primary" },
  Owner: { label: "Chủ xưởng", shortLabel: "Chủ xưởng", description: "Theo dõi và vận hành toàn bộ xưởng.", tone: "warning" },
  PM: { label: "Quản lý sản xuất", shortLabel: "Quản lý sản xuất", description: "Phụ trách nhân sự và sản xuất.", tone: "info" },
  Worker: { label: "Nhân viên", shortLabel: "Nhân viên", description: "Thực hiện công việc được phân công.", tone: "success" },
};

const METHOD_LABELS = {
  GET: "Xem",
  POST: "Tạo mới",
  PUT: "Cập nhật",
  PATCH: "Điều chỉnh",
  DELETE: "Xóa",
};

const CONTROLLER_LABELS = {
  Account: "Tài khoản",
  Cloudinary: "Tải tệp",
  Comment: "Bình luận",
  Customer: "Khách hàng",
  CuttingNotebook: "Sổ cắt",
  Email: "Email",
  LeaveRequest: "Nghỉ phép",
  Log: "Nhật ký",
  Order: "Đơn hàng",
  OrderReject: "Từ chối đơn hàng",
  Permission: "Phân quyền",
  Production: "Sản xuất",
  ProductionPart: "Công đoạn sản xuất",
  Product: "Sản phẩm",
  Template: "Mẫu rập",
  User: "Người dùng",
  Worker: "Nhân viên",
  WorkerRole: "Chuyên môn thợ",
};

function getPermissionCaption(permission) {
  const controllerLabel = CONTROLLER_LABELS[permission.controller] || permission.controller || "Khác";
  const methodLabel = METHOD_LABELS[permission.method] || permission.method || "Xử lý";

  return {
    moduleLabel: controllerLabel,
    actionLabel: methodLabel,
    title: `${controllerLabel} · ${permission.action || permission.method}`,
    subtitle: `${permission.method} / ${permission.controller} / ${permission.action}`,
  };
}

export default function AdminManagePermission() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRole, setSelectedRole] = useState(searchParams.get("role") || "");
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [permissionError, setPermissionError] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [permissionAuditItems, setPermissionAuditItems] = useState([]);
  const [draftPermissions, setDraftPermissions] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState(null);

  const permissionItems = useMemo(() => {
    return [...permissions]
      .map((item) => ({
        ...item,
        summary: getPermissionCaption(item),
      }))
      .sort((left, right) => {
        const leftKey = `${left.controller}-${left.method}-${left.action}`;
        const rightKey = `${right.controller}-${right.method}-${right.action}`;
        return leftKey.localeCompare(rightKey, "vi");
      });
  }, [permissions]);

  const roleOptions = useMemo(() => {
    const uniqueRoles = new Map();
    permissionItems.forEach((permission) => {
      permission.roles.forEach((role) => {
        if (!role?.id || !role?.name || uniqueRoles.has(role.id)) return;
        const meta = ROLE_META[role.name] || {};
        uniqueRoles.set(role.id, {
          id: role.id,
          key: role.name,
          label: meta.label || role.name,
          shortLabel: meta.shortLabel || meta.label || role.name,
          description: meta.description || `Theo dõi quyền đang gán cho vai trò ${role.name}.`,
          tone: meta.tone || "info",
        });
      });
    });
    return Array.from(uniqueRoles.values()).sort((left, right) => left.id - right.id);
  }, [permissionItems]);

  useEffect(() => {
    const roleFromQuery = searchParams.get("role");
    if (roleFromQuery && roleOptions.some((role) => role.key === roleFromQuery)) {
      if (selectedRole !== roleFromQuery) setSelectedRole(roleFromQuery);
      return;
    }
    if (!selectedRole && roleOptions[0]?.key) {
      setSelectedRole(roleOptions[0].key);
    }
  }, [roleOptions, searchParams, selectedRole]);

  const activeRole = useMemo(
    () => roleOptions.find((role) => role.key === selectedRole) || roleOptions[0] || null,
    [roleOptions, selectedRole]
  );
  const selectedRoleId = activeRole?.id || null;

  const permissionCount = permissionItems.length;

  const roleCoverageText = useMemo(() => {
    if (permissionLoading) return "Đang kiểm tra dữ liệu quyền từ hệ thống.";
    if (permissionError) return "Không tải được danh mục quyền.";
    if (permissionCount > 0) return `Đã có ${permissionCount} quyền từ hệ thống và có thể lưu trực tiếp trên máy chủ.`;
    return "Hệ thống chưa trả quyền nào để màn quản trị hiển thị.";
  }, [permissionCount, permissionError, permissionLoading]);

  const grantedPermissionCount = useMemo(() => {
    return permissionItems.reduce((count, item) => count + (draftPermissions[item.id] ? 1 : 0), 0);
  }, [draftPermissions, permissionItems]);

  const hasDraftChanges = useMemo(() => {
    if (!selectedRoleId) return false;

    return permissionItems.some((item) => {
      const currentValue = item.roleIds.includes(selectedRoleId);
      return Boolean(draftPermissions[item.id]) !== currentValue;
    });
  }, [draftPermissions, permissionItems, selectedRoleId]);

  const handleRoleChange = (roleKey) => {
    const next = new URLSearchParams(searchParams);
    next.set("role", roleKey);
    setSearchParams(next);
    setSelectedRole(roleKey);
    setSaveNotice(null);
  };

  const handleTogglePermission = (permissionId) => {
    setDraftPermissions((current) => ({
      ...current,
      [permissionId]: !current[permissionId],
    }));
    setSaveNotice(null);
  };

  const handleResetDraft = () => {
    if (!selectedRoleId) return;

    setDraftPermissions(
      permissionItems.reduce((accumulator, item) => {
        accumulator[item.id] = item.roleIds.includes(selectedRoleId);
        return accumulator;
      }, {})
    );
      setSaveNotice({
        tone: "info",
        title: "Đã hoàn tác bản nháp",
        description: `Quyền của ${activeRole?.label || "vai trò đang chọn"} đã được đưa về đúng trạng thái hiện tại của hệ thống.`,
      });
  };

  const loadPermissionData = async () => {
    setPermissionLoading(true);
    setPermissionError("");

    try {
      const [permissionResponse, auditResponse] = await Promise.all([
        PermissionService.getPermissions(),
        PermissionService.getPermissionAudit({ PageIndex: 0, PageSize: 5 }),
      ]);

      setPermissions(Array.isArray(permissionResponse?.data) ? permissionResponse.data : []);
      setPermissionAuditItems(Array.isArray(auditResponse?.data) ? auditResponse.data : []);
    } catch (error) {
      setPermissions([]);
      setPermissionAuditItems([]);
      setPermissionError(
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Không thể tải dữ liệu quyền từ hệ thống."
      );
    } finally {
      setPermissionLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedRoleId) return;

    const changedItems = permissionItems.filter((item) => {
      const currentValue = item.roleIds.includes(selectedRoleId);
      return Boolean(draftPermissions[item.id]) !== currentValue;
    });

    if (changedItems.length === 0) return;

    try {
      setSaving(true);
      setSaveNotice(null);

      for (const item of changedItems) {
        const nextRoleIds = draftPermissions[item.id]
          ? Array.from(new Set([...item.roleIds, selectedRoleId]))
          : item.roleIds.filter((roleId) => roleId !== selectedRoleId);

        await PermissionService.updatePermission(item.id, nextRoleIds);
      }

      await loadPermissionData();

      setSaveNotice({
        tone: "success",
        title: "Đã lưu quyền thành công",
        description: `Đã cập nhật ${changedItems.length} quyền cho ${activeRole?.label || "vai trò đang chọn"}.`,
      });
    } catch (error) {
      setSaveNotice({
        tone: "danger",
        title: "Không lưu được thay đổi",
        description:
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          "Backend chưa chấp nhận thay đổi quyền vừa chọn.",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadPermissionData();
  }, []);

  useEffect(() => {
    if (!selectedRoleId) return;

    setDraftPermissions(
      permissionItems.reduce((accumulator, item) => {
        accumulator[item.id] = item.roleIds.includes(selectedRoleId);
        return accumulator;
      }, {})
    );
    setSaveNotice(null);
  }, [permissionItems, selectedRoleId]);

  return (
    <DashboardLayout>
      <div className="admin-page">
        <div className="admin-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="admin-hero">
            <div className="admin-hero__heading">
              <h1 className="admin-hero__title">Phân quyền hệ thống</h1>
              <p className="admin-hero__subtitle">
                Chọn vai trò, xem quyền hiện có và lưu thay đổi trực tiếp lên hệ thống.
              </p>
            </div>

            <div className="admin-hero__actions">
              <Link to="/admin/users" className="admin-btn admin-btn--secondary admin-focusable">
                Mở quản lý tài khoản
              </Link>
              <Link to="/admin/logs" className="admin-btn admin-btn--primary admin-focusable">
                Mở nhật ký hệ thống
              </Link>
            </div>
          </div>

          <AdminBanner
            title={
              permissionLoading
                ? "Đang tải danh mục quyền."
                : permissionCount > 0
                  ? `Đã nhận ${permissionCount} quyền từ hệ thống.`
                  : "Chức năng phân quyền đang hoạt động nhưng chưa có dữ liệu đầy đủ."
            }
            description={permissionError || roleCoverageText}
            tone={permissionError ? "danger" : permissionCount > 0 ? "success" : "warning"}
          />

          <div className="admin-stats-grid">
            <AdminStatCard
              icon={ShieldCheck}
              label="Số vai trò"
              value={roleOptions.length}
              meta="Các vai trò thực sự xuất hiện trong dữ liệu quyền"
              tone="primary"
            />
            <AdminStatCard
              icon={Users}
              label="Vai trò đang chọn"
              value={activeRole?.shortLabel || "..."}
              meta="Mọi thay đổi bên dưới áp dụng cho vai trò này"
              tone="info"
            />
            <AdminStatCard
              icon={ShieldAlert}
              label="Quyền từ hệ thống"
              value={permissionLoading ? "..." : permissionCount}
              meta={
                permissionError
                  ? "Không tải được từ hệ thống"
                  : permissionCount > 0
                    ? "Hệ thống đã trả dữ liệu quyền"
                    : "Chưa có bản ghi nào để màn phân quyền hiển thị"
              }
              tone={permissionCount > 0 ? "success" : "danger"}
            />
            <AdminStatCard
              icon={ShieldCheck}
              label="Quyền đang bật"
              value={grantedPermissionCount}
              meta="Tổng số thao tác đang được bật cho vai trò đang chọn"
              tone="warning"
            />
          </div>

          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                  <h2 className="admin-card__title">Chọn vai trò cần rà soát</h2>
                  <p className="admin-card__subtitle">
                    Danh sách vai trò được gom trực tiếp từ từng bản ghi quyền mà backend trả về.
                  </p>
                </div>
              </div>

              <div className="admin-role-grid">
              {roleOptions.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    className={`admin-role-card admin-focusable ${selectedRole === role.key ? "is-active" : ""}`}
                    onClick={() => handleRoleChange(role.key)}
                  >
                    <AdminRoleBadge tone={role.tone}>{role.label}</AdminRoleBadge>
                    <strong className="mt-3">{role.shortLabel}</strong>
                    <span>{role.description}</span>
                  </button>
                ))}
              </div>
          </section>

          <div className="admin-grid admin-grid--permissions">
            <section className="admin-card">
              <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Ma trận quyền theo vai trò</h2>
                    <p className="admin-card__subtitle">
                    Bật hoặc tắt từng quyền đang có cho vai trò đã chọn. Thay đổi sẽ được lưu trực tiếp vào hệ thống.
                  </p>
                </div>
              </div>

              {saveNotice ? (
                <AdminBanner title={saveNotice.title} description={saveNotice.description} tone={saveNotice.tone || "success"} />
              ) : null}

              <div className="admin-permission-list">
                {permissionLoading ? (
                  <div className="admin-state">
                    <div className="admin-state__content">
                      <strong>Đang tải quyền hệ thống...</strong>
                      <span>Dữ liệu quyền đang được đồng bộ từ máy chủ.</span>
                    </div>
                  </div>
                ) : permissionError ? (
                  <div className="admin-state">
                    <div className="admin-state__content">
                      <strong>Không tải được danh mục quyền</strong>
                      <span>{permissionError}</span>
                    </div>
                  </div>
                ) : permissionItems.length === 0 ? (
                  <div className="admin-state">
                    <div className="admin-state__content">
                      <strong>Chưa có quyền nào để hiển thị</strong>
                      <span>Hệ thống chưa trả danh mục quyền cho màn phân quyền.</span>
                    </div>
                  </div>
                ) : (
                  permissionItems.map((permission) => {
                    const isEnabled = Boolean(draftPermissions[permission.id]);
                    const isChanged = selectedRoleId
                      ? isEnabled !== permission.roleIds.includes(selectedRoleId)
                      : false;

                    return (
                    <article key={permission.id} className="admin-permission-item">
                      <div className="admin-permission-item__top">
                        <div className="admin-permission-item__identity">
                          <div className="admin-permission-item__code">
                            {permission.summary.moduleLabel.slice(0, 3).toUpperCase()}
                          </div>
                          <div className="admin-permission-item__heading">
                            <strong>{permission.summary.title}</strong>
                            <p className="admin-table__secondary">{permission.summary.subtitle}</p>
                          </div>
                        </div>

                        <div className="admin-permission-item__summary">
                          <div className="admin-permission-item__summary-stack">
                            <AdminRoleBadge tone={activeRole?.tone || "info"}>{activeRole?.label || "Vai trò"}</AdminRoleBadge>
                            <AdminRoleBadge tone={isEnabled ? "success" : "danger"}>
                              {isEnabled ? "Đang bật" : "Đang tắt"}
                            </AdminRoleBadge>
                          </div>
                        </div>
                      </div>

                      <div className="admin-permission-item__path">
                        {permission.method} / {permission.controller} / {permission.action}
                      </div>

                      <div className="admin-permission-item__body">
                        <div className="admin-permission-panel admin-permission-panel--current">
                          <span className="admin-permission-panel__title">Hiện tại</span>
                          <div className="admin-permission-panel__summary">
                            {selectedRoleId && permission.roleIds.includes(selectedRoleId) ? "Đang có quyền" : "Chưa có quyền"}
                          </div>
                          <div className="admin-permission-table__draft admin-table__secondary">
                            {selectedRoleId && permission.roleIds.includes(selectedRoleId)
                              ? "Vai trò đang được phép dùng thao tác này."
                              : "Vai trò hiện chưa được phép dùng thao tác này."}
                          </div>
                        </div>

                        <div className="admin-permission-panel admin-permission-panel--draft">
                          <span className="admin-permission-panel__title">Bản nháp</span>
                          <div className="admin-permission-table__roles">
                            <label className="admin-permission-check">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={() => handleTogglePermission(permission.id)}
                              />
                              <span>{isEnabled ? "Đang bật cho vai trò này" : "Đang tắt cho vai trò này"}</span>
                            </label>
                          </div>
                        </div>

                        <div className="admin-permission-panel admin-permission-panel--actions">
                          <span className="admin-permission-panel__title">Ghi chú</span>
                          <div className="admin-permission-panel__summary">
                            {isChanged ? "Có thay đổi chưa lưu" : "Không có thay đổi"}
                          </div>
                          <div className="admin-permission-table__draft">
                            Vai trò đang có quyền: {permission.roles.length}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                }))}
              </div>

              <div className="admin-permission-table__actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-focusable"
                  onClick={handleResetDraft}
                  disabled={!hasDraftChanges}
                >
                  <RotateCcw size={16} />
                  Hoàn tác
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary admin-focusable"
                  onClick={handleSaveDraft}
                  disabled={!hasDraftChanges}
                >
                  <Save size={16} />
                  Lưu ma trận quyền
                </button>
              </div>
            </section>

            <aside className="admin-sidebar-stack">
              <section className="admin-card">
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Tóm tắt vai trò</h2>
                    <p className="admin-card__subtitle">Thông tin rút trực tiếp từ danh sách quyền hiện có của backend.</p>
                  </div>
                </div>

                <div className="admin-preview-list">
                  <div className="admin-preview-list__item">
                    <strong>Vai trò</strong>
                    <span>{activeRole?.label || "Chưa chọn"}</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>Số quyền đang bật</strong>
                    <span>{grantedPermissionCount}</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>Trạng thái quyền</strong>
                    <span>{roleCoverageText}</span>
                  </div>
                  {permissionAuditItems[0] ? (
                    <div className="admin-preview-list__item">
                      <strong>Ghi nhận gần nhất</strong>
                      <span>{formatAdminDateTime(permissionAuditItems[0]?.timestamp)}</span>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="admin-card">
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Nhật ký phân quyền gần đây</h2>
                    <p className="admin-card__subtitle">Các bản ghi gần nhất hệ thống trả về để theo dõi thay đổi quyền.</p>
                  </div>
                </div>

                {permissionAuditItems.length === 0 ? (
                  <div className="admin-preview-list">
                    <div className="admin-preview-list__item">
                      <strong>Chưa có dữ liệu nhật ký</strong>
                      <span>Hệ thống chưa trả bản ghi thay đổi quyền gần đây.</span>
                    </div>
                  </div>
                ) : (
                  <div className="admin-preview-list">
                    {permissionAuditItems.map((item) => (
                      <div key={item.id || `${item.timestamp}-${item.message}`} className="admin-preview-list__item">
                        <strong>{item.message || "Thay đổi phân quyền"}</strong>
                        <span>{formatAdminDateTime(item.timestamp)}</span>
                        <span className="admin-preview-list__subtext">{item.level || "Thông tin"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>

          <div className="admin-grid admin-grid--permissions">
            <section className="admin-card">
              <div className="admin-card__header">
                <div>
                  <h2 className="admin-card__title">Quyền trả về từ hệ thống</h2>
                  <p className="admin-card__subtitle">Danh sách rút gọn để kiểm nhanh controller, action và method hiện có.</p>
                </div>
              </div>

              <div className="admin-preview-list admin-preview-list--compact">
                {permissionItems.slice(0, 8).map((permission) => (
                  <div key={permission.id} className="admin-preview-list__item">
                    <strong>{permission.summary.title}</strong>
                    <span>{permission.summary.subtitle}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-card">
              <div className="admin-card__header">
                <div>
                  <h2 className="admin-card__title">Vai trò đang có trong dữ liệu quyền</h2>
                  <p className="admin-card__subtitle">Danh sách này được gom từ các role đi kèm từng bản ghi quyền.</p>
                </div>
              </div>

              <div className="admin-preview-list admin-preview-list--compact">
                {roleOptions.map((role) => (
                  <div key={role.id} className="admin-preview-list__item">
                    <strong>{role.label}</strong>
                    <span>{role.description}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-card">
              <div className="admin-card__header">
                <div>
                  <h2 className="admin-card__title">Điểm cần lưu ý</h2>
                  <p className="admin-card__subtitle">Các ghi chú ngắn để quản trị viên nắm phạm vi hiển thị hiện tại của màn phân quyền.</p>
                </div>
              </div>

              <div className="admin-preview-list admin-preview-list--compact">
                <div className="admin-preview-list__item">
                  <strong>Nguồn vai trò</strong>
                  <span>Vai trò đang được suy ra từ dữ liệu quyền, không lấy từ catalog nội bộ riêng.</span>
                </div>
                <div className="admin-preview-list__item">
                  <strong>Nguồn nhật ký</strong>
                  <span>Màn chỉ hiển thị những gì backend trả về từ audit quyền.</span>
                </div>
                <div className="admin-preview-list__item">
                  <strong>Đi tới quản lý tài khoản</strong>
                  <span>
                    <Link to="/admin/users" className="admin-link-btn admin-link-btn--secondary">
                      Mở danh sách tài khoản
                    </Link>
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
