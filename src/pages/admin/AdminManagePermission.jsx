import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, RotateCcw, Save, ShieldAlert, ShieldCheck, Table2, Users } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  ADMIN_DB_PERMISSION_CORE_TABLES,
  ADMIN_DB_ROLE_BLUEPRINTS,
  ADMIN_DB_USER_FOREIGN_TABLES,
  getAdminDbRoleBlueprint,
  getAdminDbRoleOptions,
} from "@/lib/admin/adminSchemaBlueprint";
import {
  AdminBanner,
  AdminRoleBadge,
  AdminStatCard,
  formatAdminDateTime,
} from "@/pages/admin/adminShared";
import PermissionService from "@/services/PermissionService";

const BACKEND_ROLE_ID_MAP = {
  Admin: 1,
  Customer: 2,
  Owner: 3,
  PM: 4,
  Worker: 5,
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

function normalizeSearchText(value = "") {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function isBusinessTableRelatedToRole(tableInfo, blueprint) {
  const scopeText = normalizeSearchText(
    [
      blueprint.key,
      blueprint.label,
      blueprint.shortLabel,
      blueprint.description,
      blueprint.joinPath,
      ...blueprint.touchpoints.map((item) => `${item.table} ${item.columns} ${item.relation}`),
    ].join(" ")
  );

  const tableTokens = [
    tableInfo.table,
    String(tableInfo.table ?? "").replaceAll("[", "").replaceAll("]", ""),
    tableInfo.module,
    tableInfo.column,
    tableInfo.purpose,
  ].map((token) => normalizeSearchText(token));

  return tableTokens.some((token) => token && scopeText.includes(token));
}

function formatSimpleTableLabel(value = "") {
  return String(value ?? "").replaceAll("[", "").replaceAll("]", "");
}

function getRoleToneByName(roleName = "") {
  return getAdminDbRoleBlueprint(roleName)?.tone || "info";
}

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
  const selectedRole = searchParams.get("role") || ADMIN_DB_ROLE_BLUEPRINTS[0].key;
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [permissionError, setPermissionError] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [permissionAuditItems, setPermissionAuditItems] = useState([]);
  const [draftPermissions, setDraftPermissions] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState(null);

  const roleOptions = useMemo(() => getAdminDbRoleOptions(), []);
  const activeBlueprint = useMemo(() => getAdminDbRoleBlueprint(selectedRole), [selectedRole]);
  const selectedRoleId = BACKEND_ROLE_ID_MAP[activeBlueprint.key] || null;

  const relatedBusinessTables = useMemo(() => {
    return ADMIN_DB_USER_FOREIGN_TABLES.filter((tableInfo) =>
      isBusinessTableRelatedToRole(tableInfo, activeBlueprint)
    );
  }, [activeBlueprint]);

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
      description: `Quyền của ${activeBlueprint.label} đã được đưa về đúng trạng thái hiện tại của hệ thống.`,
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
        description: `Đã cập nhật ${changedItems.length} quyền cho ${activeBlueprint.label}.`,
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
                Theo dõi vai trò đang có trong hệ thống, phạm vi dữ liệu liên quan và mức độ sẵn sàng của hệ thống cho phân quyền chi tiết.
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
              meta="Các vai trò nội bộ đang được web theo dõi"
              meta="Các vai trò nội bộ đang được hệ thống theo dõi"
              tone="primary"
            />
            <AdminStatCard
              icon={Table2}
              label="Bảng lõi"
              value={ADMIN_DB_PERMISSION_CORE_TABLES.length}
              meta="Các bảng đang tham gia vào luồng vai trò hiện tại"
              tone="success"
            />
            <AdminStatCard
              icon={Users}
              label="Bảng nghiệp vụ"
              value={ADMIN_DB_USER_FOREIGN_TABLES.length}
              meta="Những bảng có liên quan tới tài khoản hoặc người phụ trách"
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
                    : "Chưa có bản ghi nào để web hiển thị"
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
                  Mỗi vai trò hiển thị các bảng đang liên quan và mức độ sẵn sàng của hệ thống cho phân quyền chi tiết.
                </p>
              </div>
            </div>

            <div className="admin-role-grid">
              {roleOptions.map((role) => {
                const blueprint = getAdminDbRoleBlueprint(role.key);

                return (
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
                      <span>{blueprint.touchpoints.length} điểm dữ liệu liên quan</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="admin-grid admin-grid--permissions">
            <section className="admin-card">
              <div className="admin-card__header">
                <div>
                  <h2 className="admin-card__title">Ma trận quyền theo vai trò</h2>
                  <p className="admin-card__subtitle">
                    Bật hoặc tắt từng quyền hệ thống đang trả về cho vai trò đã chọn. Thay đổi được lưu trực tiếp theo dữ liệu hiện có.
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
                            <AdminRoleBadge tone={activeBlueprint.tone}>{activeBlueprint.label}</AdminRoleBadge>
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
                          <div className="admin-permission-table__badges">
                            <AdminRoleBadge tone={selectedRoleId && permission.roleIds.includes(selectedRoleId) ? "success" : "danger"}>
                              {selectedRoleId && permission.roleIds.includes(selectedRoleId) ? "Vai trò này đang có quyền" : "Vai trò này chưa có quyền"}
                            </AdminRoleBadge>
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
                              <span>{isEnabled ? "Bật quyền này cho vai trò đang chọn" : "Tắt quyền này cho vai trò đang chọn"}</span>
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

            <section className="admin-card">
              <div className="admin-card__header">
                <div>
                  <h2 className="admin-card__title">Phạm vi dữ liệu của {activeBlueprint.label}</h2>
                  <p className="admin-card__subtitle">
                    Tập trung vào bảng, cột và mối liên hệ đang ảnh hưởng trực tiếp đến vai trò này.
                  </p>
                </div>
              </div>

              <div className="admin-matrix-wrap">
                <table className="admin-matrix">
                  <thead>
                    <tr>
                      <th>Phạm vi</th>
                      <th>Bảng</th>
                      <th>Cột</th>
                      <th>Ý nghĩa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeBlueprint.touchpoints.map((touchpoint) => (
                      <tr key={`${activeBlueprint.key}-${touchpoint.table}-${touchpoint.columns}`}>
                        <td>
                          <div className="admin-chips">
                            <AdminRoleBadge tone={touchpoint.tone}>{touchpoint.scope}</AdminRoleBadge>
                          </div>
                        </td>
                        <td>
                          <div className="admin-table__primary">{formatSimpleTableLabel(touchpoint.table)}</div>
                        </td>
                        <td>
                          <div className="admin-table__secondary">{touchpoint.columns}</div>
                        </td>
                        <td>
                          <div className="admin-table__secondary">{touchpoint.relation}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="admin-sidebar-stack">
              <section className="admin-card">
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Tóm tắt vai trò</h2>
                    <p className="admin-card__subtitle">Những gì quản trị viên cần nắm nhanh trước khi chỉnh phân quyền.</p>
                  </div>
                </div>

                <div className="admin-preview-list">
                  <div className="admin-preview-list__item">
                    <strong>Vai trò</strong>
                    <span>{activeBlueprint.label}</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>Luồng dữ liệu</strong>
                    <span>{activeBlueprint.joinPath}</span>
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
                    <h2 className="admin-card__title">Bảng nghiệp vụ liên quan</h2>
                    <p className="admin-card__subtitle">Các bảng có thể bị ảnh hưởng khi role này tham gia quy trình nghiệp vụ.</p>
                  </div>
                </div>

                {relatedBusinessTables.length === 0 ? (
                  <div className="admin-note-box">
                    <strong>Chưa xác định rõ bảng nghiệp vụ</strong>
                    <p>Vai trò này hiện chủ yếu đi qua bảng nối hoặc hệ thống chưa trả đủ dữ liệu để ánh xạ sâu hơn.</p>
                  </div>
                ) : (
                  <div className="admin-preview-list">
                    {relatedBusinessTables.map((tableInfo) => (
                      <div key={`${tableInfo.table}-${tableInfo.column}`} className="admin-preview-list__item">
                        <strong>{formatSimpleTableLabel(tableInfo.table)}</strong>
                        <span>{tableInfo.purpose}</span>
                        <span className="admin-preview-list__subtext">
                          {tableInfo.module} <ArrowRight size={14} /> {tableInfo.column}
                        </span>
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
                  <h2 className="admin-card__title">Bảng lõi hiện có</h2>
                  <p className="admin-card__subtitle">Những bảng của hệ thống đang thực sự tham gia vào cơ chế vai trò hiện tại.</p>
                </div>
              </div>

              <div className="admin-preview-list admin-preview-list--compact">
                {ADMIN_DB_PERMISSION_CORE_TABLES.map((tableInfo) => (
                  <div key={tableInfo.table} className="admin-preview-list__item">
                    <strong>{formatSimpleTableLabel(tableInfo.table)}</strong>
                    <span>{tableInfo.description}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-card">
              <div className="admin-card__header">
                <div>
                  <h2 className="admin-card__title">Nhật ký phân quyền gần đây</h2>
                  <p className="admin-card__subtitle">Các bản ghi gần nhất hệ thống trả về để theo dõi thay đổi quyền.</p>
                </div>
              </div>

              <div className="admin-preview-list admin-preview-list--compact">
                {permissionAuditItems.length === 0 ? (
                  <div className="admin-preview-list__item">
                    <strong>Chưa có dữ liệu nhật ký</strong>
                    <span>Hệ thống chưa trả bản ghi thay đổi quyền gần đây.</span>
                  </div>
                ) : (
                  permissionAuditItems.map((item) => (
                    <div key={item.id || `${item.timestamp}-${item.message}`} className="admin-preview-list__item">
                      <strong>{item.message || "Thay đổi phân quyền"}</strong>
                      <span>{formatAdminDateTime(item.timestamp)}</span>
                      <span className="admin-preview-list__subtext">{item.level || "Thông tin"}</span>
                    </div>
                  ))
                )}
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
                {activeBlueprint.gaps.map((gap) => (
                  <div key={gap} className="admin-preview-list__item">
                    <strong>{activeBlueprint.label}</strong>
                    <span>{gap}</span>
                  </div>
                ))}
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
