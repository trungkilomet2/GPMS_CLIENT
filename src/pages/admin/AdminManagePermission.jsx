import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ShieldAlert, ShieldCheck, Table2, Users } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  ADMIN_DB_PERMISSION_CORE_TABLES,
  ADMIN_DB_PERMISSION_GAPS,
  ADMIN_DB_ROLE_BLUEPRINTS,
  ADMIN_DB_SCHEMA_VERSION,
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
              <h1 className="admin-hero__title">Manage Permission Screen</h1>
              <p className="admin-hero__subtitle">
                Màn này dùng để theo dõi role trong hệ thống và phần permission backend đã trả về. Hiện database mới có
                phần gán role và worker skill, nên web chưa thể quản lý permission chi tiết theo từng chức năng.
              </p>
            </div>

            <div className="admin-hero__actions">
              <Link to="/admin/users" className="admin-btn admin-btn--secondary admin-focusable">
                Mở Quản lý user
              </Link>
              <Link to="/admin/logs" className="admin-btn admin-btn--primary admin-focusable">
                Mở System Log
              </Link>
            </div>
          </div>

          <AdminBanner
            title={
              permissionLoading
                ? "Đang tải permission catalog từ backend."
                : permissionCount > 0
                  ? `Backend hiện trả về ${permissionCount} permission.`
                  : "Backend đã có endpoint Permission nhưng hiện chưa có dữ liệu."
            }
            description={
              permissionError ||
              (permissionCount > 0
                ? "Web đã đọc được danh sách permission từ backend."
                : "API Permission đang chạy nhưng chưa có dữ liệu, nên màn này tạm hiển thị các role và bảng liên quan để Admin theo dõi.")
            }
            tone={permissionError ? "danger" : permissionCount > 0 ? "success" : "warning"}
          />

          <div className="admin-stats-grid">
            <AdminStatCard
              icon={ShieldCheck}
              label="Số role"
              value={roleOptions.length}
              meta="Các role đang có trong hệ thống"
              tone="primary"
            />
            <AdminStatCard
              icon={Table2}
              label="Bảng role chính"
              value={ADMIN_DB_PERMISSION_CORE_TABLES.length}
              meta="ROLE, USER_ROLE, WORKER_SKILL, USER_WORKER_SKILL"
              tone="success"
            />
            <AdminStatCard
              icon={Users}
              label="Bảng liên quan"
              value={ADMIN_DB_USER_FOREIGN_TABLES.length}
              meta="Các bảng có liên quan tới user hoặc người phụ trách"
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
                    ? "Số permission backend đang trả về"
                    : "API đang hoạt động nhưng chưa có dữ liệu"
              }
              tone={permissionCount > 0 ? "success" : "danger"}
            />
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

          <div className="admin-grid admin-grid--permissions">
            <section className="admin-card">
              <div className="admin-card__header">
                <div>
                  <h2 className="admin-card__title">Role và dữ liệu liên quan</h2>
                  <p className="admin-card__subtitle">
                    Đây là các bảng và cột đang liên quan tới role <strong>{activeBlueprint.label}</strong>.
                  </p>
                </div>
              </div>

              <div className="admin-matrix-wrap">
                <table className="admin-matrix">
                  <thead>
                    <tr>
                      <th>Scope</th>
                      <th>Table</th>
                      <th>Columns</th>
                      <th>Quan hệ / ý nghĩa</th>
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

            <div className="flex flex-col gap-6">
              <section className="admin-card">
                <div className="admin-card__header">
                <div>
                  <h2 className="admin-card__title">Tóm tắt role đang chọn</h2>
                  <p className="admin-card__subtitle">Thông tin ngắn gọn để Admin biết role này đang đi qua những phần nào.</p>
                </div>
              </div>

                <div className="admin-preview-list">
                  <div className="admin-preview-list__item">
                    <strong>Role</strong>
                    <span>{activeBlueprint.label}</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>Luồng dữ liệu</strong>
                    <span>{activeBlueprint.joinPath}</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>Điểm dữ liệu</strong>
                    <span>{activeBlueprint.touchpoints.length} vị trí dữ liệu đang liên quan tới role này.</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>Trạng thái hiện tại</strong>
                    <span>Hệ thống đang gán role theo bảng nối, chưa có phân quyền chi tiết cho từng chức năng.</span>
                  </div>
                </div>
              </section>

              <section className="admin-card">
                <div className="admin-card__header">
                <div>
                  <h2 className="admin-card__title">Bảng lõi của tầng phân quyền</h2>
                  <p className="admin-card__subtitle">Các bảng backend đang dùng để gán role và kỹ năng thợ.</p>
                </div>
              </div>

                <div className="admin-preview-list">
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
                  <h2 className="admin-card__title">Những phần còn thiếu</h2>
                  <p className="admin-card__subtitle">Các phần backend còn thiếu nếu muốn làm màn phân quyền đầy đủ hơn.</p>
                </div>
              </div>

                <div className="admin-preview-list">
                  {activeBlueprint.gaps.map((gap) => (
                    <div key={gap} className="admin-preview-list__item">
                      <strong>{activeBlueprint.label}</strong>
                      <span>{gap}</span>
                    </div>
                  ))}
                  {ADMIN_DB_PERMISSION_GAPS.map((gap) => (
                    <div key={gap.table} className="admin-preview-list__item">
                      <strong>{formatSimpleTableLabel(gap.table)}</strong>
                      <span>{gap.impact}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <div className="admin-grid admin-grid--permissions">
            <section className="admin-card">
              <div className="admin-card__header">
                <div>
                  <h2 className="admin-card__title">Bảng business liên quan đến role</h2>
                  <p className="admin-card__subtitle">
                    Những bảng bên dưới cho biết role <strong>{activeBlueprint.label}</strong> đang liên quan tới phần nào trong nghiệp vụ.
                  </p>
                </div>
              </div>

              {relatedBusinessTables.length === 0 ? (
                <div className="admin-note-box">
                  <strong>Chưa thấy bảng nghiệp vụ rõ ràng</strong>
                  <p>Role này hiện chủ yếu đi qua bảng nối hoặc backend chưa trả đủ dữ liệu để xác định rõ hơn.</p>
                </div>
              ) : (
                <div className="admin-role-grid">
                  {relatedBusinessTables.map((tableInfo) => (
                    <div key={`${tableInfo.table}-${tableInfo.column}`} className="admin-role-card">
                      <AdminRoleBadge tone="info">{tableInfo.module}</AdminRoleBadge>
                      <strong className="mt-3">{formatSimpleTableLabel(tableInfo.table)}</strong>
                      <span>{tableInfo.purpose}</span>
                      <div className="admin-role-card__meta">
                        <span>Cột liên quan: {tableInfo.column}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="admin-card">
              <div className="admin-card__header">
                <div>
                  <h2 className="admin-card__title">Việc cần backend bổ sung</h2>
                  <p className="admin-card__subtitle">Các phần cần có nếu muốn màn này quản lý permission thật sự.</p>
                </div>
              </div>

              <div className="admin-preview-list">
                <div className="admin-preview-list__item">
                  <strong>1. Danh sách permission</strong>
                  <span>Cần có dữ liệu trong `PERMISSION` để web đọc và hiển thị.</span>
                </div>
                <div className="admin-preview-list__item">
                  <strong>2. Gán permission cho role</strong>
                  <span>Cần có `ROLE_PERMISSION` để lưu quyền thật cho từng role.</span>
                </div>
                <div className="admin-preview-list__item">
                  <strong>3. Lịch sử đổi role</strong>
                  <span>Cần có `ROLE_CHANGE_AUDIT` để theo dõi khi admin đổi role cho user.</span>
                </div>
                <div className="admin-preview-list__item">
                  <strong>Shortcut</strong>
                  <span>
                    <Link to="/admin/users" className="admin-link-btn admin-link-btn--secondary">
                      Đi tới màn gán role cho user
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
