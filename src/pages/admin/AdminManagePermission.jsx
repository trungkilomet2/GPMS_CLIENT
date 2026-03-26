import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ShieldAlert, ShieldCheck, Table2, Users } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  ADMIN_DB_PERMISSION_CORE_TABLES,
  ADMIN_DB_PERMISSION_GAPS,
  ADMIN_DB_ROLE_BLUEPRINTS,
  ADMIN_DB_USER_FOREIGN_TABLES,
  getAdminDbRoleBlueprint,
  getAdminDbRoleOptions,
} from "@/lib/admin/adminSchemaBlueprint";
import { AdminBanner, AdminRoleBadge, AdminStatCard } from "@/pages/admin/adminShared";
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

  const roleOptions = useMemo(() => getAdminDbRoleOptions(), []);
  const activeBlueprint = useMemo(() => getAdminDbRoleBlueprint(selectedRole), [selectedRole]);

  const relatedBusinessTables = useMemo(() => {
    return ADMIN_DB_USER_FOREIGN_TABLES.filter((tableInfo) =>
      isBusinessTableRelatedToRole(tableInfo, activeBlueprint)
    );
  }, [activeBlueprint]);

  const roleCoverageText = useMemo(() => {
    if (permissionLoading) return "Đang kiểm tra dữ liệu permission từ backend.";
    if (permissionError) return "Không tải được permission catalog.";
    if (permissionCount > 0) return `Đã có ${permissionCount} permission từ backend, nhưng web chưa đủ metadata để chỉnh chi tiết theo từng role.`;
    return "API permission đã sẵn sàng nhưng hiện chưa có dữ liệu để gán theo role.";
  }, [permissionCount, permissionError, permissionLoading]);

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
                  : "API permission đang hoạt động nhưng chưa có dữ liệu."
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
