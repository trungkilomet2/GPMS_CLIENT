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
  ADMIN_PERMISSION_ACTIONS,
  ADMIN_PERMISSION_MODULES,
  getPermissionProfile,
  updatePermissionProfile,
} from "@/lib/admin/adminMockStore";
import { AdminBanner, AdminRoleBadge, AdminStatCard, formatAdminDateTime } from "@/pages/admin/adminShared";
import PermissionService from "@/services/PermissionService";

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

export default function AdminManagePermission() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRole = searchParams.get("role") || ADMIN_DB_ROLE_BLUEPRINTS[0].key;
  const [permissionCount, setPermissionCount] = useState(0);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [permissionError, setPermissionError] = useState("");
  const [draftPermissions, setDraftPermissions] = useState({});
  const [saveNotice, setSaveNotice] = useState("");

  const roleOptions = useMemo(() => getAdminDbRoleOptions(), []);
  const activeBlueprint = useMemo(() => getAdminDbRoleBlueprint(selectedRole), [selectedRole]);
  const activePermissionProfile = useMemo(() => getPermissionProfile(activeBlueprint.key), [activeBlueprint.key]);

  const relatedBusinessTables = useMemo(() => {
    return ADMIN_DB_USER_FOREIGN_TABLES.filter((tableInfo) =>
      isBusinessTableRelatedToRole(tableInfo, activeBlueprint)
    );
  }, [activeBlueprint]);

  const roleCoverageText = useMemo(() => {
    if (permissionLoading) return "Đang kiểm tra dữ liệu permission từ backend.";
    if (permissionError) return "Không tải được permission catalog.";
    if (permissionCount > 0) return `Đã có ${permissionCount} permission từ backend. Ma trận bên dưới đang được admin quản lý tạm trên web để phục vụ kiểm thử và rà soát role.`;
    return "API permission đã sẵn sàng nhưng backend chưa trả đủ metadata gán theo role, nên web đang dùng ma trận nội bộ để quản trị.";
  }, [permissionCount, permissionError, permissionLoading]);

  const grantedPermissionCount = useMemo(() => {
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

  const hasDraftChanges = useMemo(() => {
    return JSON.stringify(draftPermissions) !== JSON.stringify(activePermissionProfile?.permissions || {});
  }, [activePermissionProfile?.permissions, draftPermissions]);

  const handleRoleChange = (roleKey) => {
    const next = new URLSearchParams(searchParams);
    next.set("role", roleKey);
    setSearchParams(next);
    setSaveNotice("");
  };

  const handleTogglePermission = (moduleKey, actionKey) => {
    setDraftPermissions((current) => ({
      ...current,
      [moduleKey]: {
        ...(current[moduleKey] || {}),
        [actionKey]: !(current[moduleKey] || {})[actionKey],
      },
    }));
    setSaveNotice("");
  };

  const handleResetDraft = () => {
    setDraftPermissions(activePermissionProfile?.permissions || {});
    setSaveNotice("Đã hoàn tác thay đổi chưa lưu.");
  };

  const handleSaveDraft = () => {
    const savedProfile = updatePermissionProfile(activeBlueprint.key, draftPermissions);
    setDraftPermissions(savedProfile?.permissions || {});
    setSaveNotice(`Đã lưu ma trận quyền cho ${activeBlueprint.label} lúc ${formatAdminDateTime(savedProfile?.updatedAt)}.`);
  };

  useEffect(() => {
    setDraftPermissions(activePermissionProfile?.permissions || {});
    setSaveNotice("");
  }, [activePermissionProfile]);

  useEffect(() => {
    let active = true;

    const loadPermissions = async () => {
      try {
        setPermissionLoading(true);
        setPermissionError("");
        const response = await PermissionService.getPermissions();
        if (!active) return;
        setPermissionCount(Array.isArray(response?.data) ? response.data.length : 0);
      } catch (error) {
        if (!active) return;
        setPermissionCount(0);
        setPermissionError(
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          "Không thể tải permission catalog từ backend."
        );
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
              <p className="admin-hero__subtitle">
                Theo dõi vai trò đang có trong hệ thống, phạm vi dữ liệu liên quan và mức độ sẵn sàng của backend cho phân quyền chi tiết.
              </p>
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
            title={
              permissionLoading
                ? "Đang tải permission catalog."
                : permissionCount > 0
                  ? `Đã nhận ${permissionCount} permission từ backend.`
                  : "API permission đang hoạt động nhưng chưa có dữ liệu đầy đủ."
            }
            description={permissionError || roleCoverageText}
            tone={permissionError ? "danger" : permissionCount > 0 ? "success" : "warning"}
          />

          <div className="admin-stats-grid">
            <AdminStatCard
              icon={ShieldCheck}
              label="Số role"
              value={roleOptions.length}
              meta="Các vai trò nội bộ đang được web theo dõi"
              tone="primary"
            />
            <AdminStatCard
              icon={Table2}
              label="Bảng lõi"
              value={ADMIN_DB_PERMISSION_CORE_TABLES.length}
              meta="Các bảng đang tham gia vào luồng role hiện tại"
              tone="success"
            />
            <AdminStatCard
              icon={Users}
              label="Bảng nghiệp vụ"
              value={ADMIN_DB_USER_FOREIGN_TABLES.length}
              meta="Những bảng có liên quan tới user hoặc người phụ trách"
              tone="info"
            />
            <AdminStatCard
              icon={ShieldAlert}
              label="Permission từ API"
              value={permissionLoading ? "..." : permissionCount}
              meta={
                permissionError
                  ? "Không tải được từ backend"
                  : permissionCount > 0
                    ? "Backend đã trả dữ liệu permission"
                    : "Chưa có bản ghi nào để web hiển thị"
              }
              tone={permissionCount > 0 ? "success" : "danger"}
            />
            <AdminStatCard
              icon={ShieldCheck}
              label="Quyền đang bật"
              value={grantedPermissionCount}
              meta="Tổng số action đang được bật cho role đang chọn"
              tone="warning"
            />
          </div>

          <section className="admin-card">
            <div className="admin-card__header">
              <div>
                <h2 className="admin-card__title">Chọn vai trò cần rà soát</h2>
                <p className="admin-card__subtitle">
                  Mỗi vai trò hiển thị các bảng đang liên quan và mức độ sẵn sàng của backend cho phân quyền chi tiết.
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
                    Bật hoặc tắt quyền cho từng module. Thay đổi được lưu vào local admin store của web để test nhanh và rà soát role.
                  </p>
                </div>
              </div>

              {saveNotice ? (
                <AdminBanner title="Cập nhật quyền" description={saveNotice} tone="success" />
              ) : null}

              <div className="admin-permission-list">
                {ADMIN_PERMISSION_MODULES.map((moduleItem) => {
                  const currentSet = activePermissionProfile?.permissions?.[moduleItem.key] || {};
                  const draftSet = draftPermissions[moduleItem.key] || {};

                  return (
                    <article key={moduleItem.key} className="admin-permission-item">
                      <div className="admin-permission-item__top">
                        <div className="admin-permission-item__identity">
                          <div className="admin-permission-item__code">{moduleItem.label.slice(0, 3).toUpperCase()}</div>
                          <div className="admin-permission-item__heading">
                            <strong>{moduleItem.label}</strong>
                            <p className="admin-table__secondary">{moduleItem.description}</p>
                          </div>
                        </div>

                        <div className="admin-permission-item__summary">
                          <div className="admin-permission-item__summary-stack">
                            <AdminRoleBadge tone={activeBlueprint.tone}>{activeBlueprint.label}</AdminRoleBadge>
                            <AdminRoleBadge tone="info">
                              {ADMIN_PERMISSION_ACTIONS.filter((action) => draftSet[action.key]).length} quyền bật
                            </AdminRoleBadge>
                          </div>
                        </div>
                      </div>

                      <div className="admin-permission-item__path">
                        {activeBlueprint.joinPath}
                      </div>

                      <div className="admin-permission-item__body">
                        <div className="admin-permission-panel admin-permission-panel--current">
                          <span className="admin-permission-panel__title">Hiện tại</span>
                          <div className="admin-permission-table__badges">
                            {ADMIN_PERMISSION_ACTIONS.map((action) => (
                              <AdminRoleBadge key={action.key} tone={currentSet[action.key] ? "success" : "danger"}>
                                {action.label}: {currentSet[action.key] ? "Bật" : "Tắt"}
                              </AdminRoleBadge>
                            ))}
                          </div>
                        </div>

                        <div className="admin-permission-panel admin-permission-panel--draft">
                          <span className="admin-permission-panel__title">Bản nháp</span>
                          <div className="admin-permission-table__roles">
                            {ADMIN_PERMISSION_ACTIONS.map((action) => (
                              <label key={action.key} className="admin-permission-check">
                                <input
                                  type="checkbox"
                                  checked={Boolean(draftSet[action.key])}
                                  onChange={() => handleTogglePermission(moduleItem.key, action.key)}
                                />
                                <span>{action.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="admin-permission-panel admin-permission-panel--actions">
                          <span className="admin-permission-panel__title">Ghi chú</span>
                          <div className="admin-permission-panel__summary">
                            {ADMIN_PERMISSION_ACTIONS.filter((action) => draftSet[action.key]).length} / {ADMIN_PERMISSION_ACTIONS.length} action đang được bật
                          </div>
                          <div className="admin-permission-table__draft">
                            Cập nhật gần nhất: {formatAdminDateTime(activePermissionProfile?.updatedAt)}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
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
                    <p className="admin-card__subtitle">Những gì admin cần nắm nhanh trước khi chỉnh phân quyền.</p>
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
                    <strong>Trạng thái permission</strong>
                    <span>{roleCoverageText}</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>Cập nhật gần nhất</strong>
                    <span>{formatAdminDateTime(activePermissionProfile?.updatedAt)}</span>
                  </div>
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
                    <p>Role này hiện chủ yếu đi qua bảng nối hoặc backend chưa trả đủ metadata để ánh xạ sâu hơn.</p>
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
                  <p className="admin-card__subtitle">Những bảng backend đang thực sự tham gia vào cơ chế role hiện tại.</p>
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
                  <h2 className="admin-card__title">Điểm cần lưu ý</h2>
                  <p className="admin-card__subtitle">Các ghi chú ngắn để admin nắm phạm vi hiển thị hiện tại của màn phân quyền.</p>
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
                  <strong>Đi tới quản lý user</strong>
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
