import { useMemo } from "react";
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
    tableInfo.table.replace(/[\[\]]/g, ""),
    tableInfo.module,
    tableInfo.column,
    tableInfo.purpose,
  ].map((token) => normalizeSearchText(token));

  return tableTokens.some((token) => token && scopeText.includes(token));
}

export default function AdminManagePermission() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRole = searchParams.get("role") || ADMIN_DB_ROLE_BLUEPRINTS[0].key;

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

  return (
    <DashboardLayout>
      <div className="admin-page">
        <div className="admin-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="admin-hero">
            <div className="admin-hero__heading">
              <h1 className="admin-hero__title">Manage Permission Screen</h1>
              <p className="admin-hero__subtitle">
                Màn phân quyền cho Admin được thiết kế lại theo schema {ADMIN_DB_SCHEMA_VERSION}. Database hiện mới có
                tầng gán role và worker role, nên màn này tập trung vào blueprint dữ liệu thay vì ma trận permission
                chi tiết theo module/action.
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
            title="Schema hiện chưa có bảng PERMISSION hoặc ROLE_PERMISSION."
            description="Vì vậy Admin mới quản trị được lớp role, bridge table và phạm vi dữ liệu mà từng role chạm tới. Khi backend bổ sung permission catalog, màn này có thể mở rộng thành capability matrix."
            tone="warning"
          />

          <div className="admin-stats-grid">
            <AdminStatCard
              icon={ShieldCheck}
              label="Role blueprint"
              value={roleOptions.length}
              meta="Các role đang được thiết kế theo schema và dữ liệu hiện có"
              tone="primary"
            />
            <AdminStatCard
              icon={Table2}
              label="Bảng lõi phân quyền"
              value={ADMIN_DB_PERMISSION_CORE_TABLES.length}
              meta="ROLE, USER_ROLE, WORKER_ROLE, USER_WORKER_ROLE"
              tone="success"
            />
            <AdminStatCard
              icon={Users}
              label="Bảng business liên quan"
              value={ADMIN_DB_USER_FOREIGN_TABLES.length}
              meta="Các bảng đang có USER_ID, PM_ID hoặc TEAM_LEADER_ID"
              tone="info"
            />
            <AdminStatCard
              icon={ShieldAlert}
              label="Permission gaps"
              value={ADMIN_DB_PERMISSION_GAPS.length}
              meta="Những bảng DB còn thiếu để làm permission matrix chuẩn"
              tone="danger"
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
                    <span>{blueprint.touchpoints.length} touchpoint trong schema</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="admin-grid admin-grid--permissions">
            <section className="admin-card">
              <div className="admin-card__header">
                <div>
                  <h2 className="admin-card__title">Role blueprint theo schema</h2>
                  <p className="admin-card__subtitle">
                    Đây là các bảng và cột mà role <strong>{activeBlueprint.label}</strong> đang chạm tới hoặc được suy
                    ra từ database.
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
                          <div className="admin-table__primary">{touchpoint.table}</div>
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
                    <p className="admin-card__subtitle">Thông tin để Admin hiểu role này đang được DB hỗ trợ tới đâu.</p>
                  </div>
                </div>

                <div className="admin-preview-list">
                  <div className="admin-preview-list__item">
                    <strong>Role</strong>
                    <span>{activeBlueprint.label}</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>Join path</strong>
                    <span>{activeBlueprint.joinPath}</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>Touchpoints</strong>
                    <span>{activeBlueprint.touchpoints.length} vị trí dữ liệu đang được role này chạm tới.</span>
                  </div>
                  <div className="admin-preview-list__item">
                    <strong>Loại quản trị hiện có</strong>
                    <span>Role assignment qua bridge table, chưa phải permission matrix theo action.</span>
                  </div>
                </div>
              </section>

              <section className="admin-card">
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Bảng lõi của tầng phân quyền</h2>
                    <p className="admin-card__subtitle">Đây là phần DB thật sự quyết định việc gán role trong hệ thống.</p>
                  </div>
                </div>

                <div className="admin-preview-list">
                  {ADMIN_DB_PERMISSION_CORE_TABLES.map((tableInfo) => (
                    <div key={tableInfo.table} className="admin-preview-list__item">
                      <strong>{tableInfo.table}</strong>
                      <span>{tableInfo.description}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="admin-card">
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">Khoảng trống của role này</h2>
                    <p className="admin-card__subtitle">Các điểm cần backend bổ sung nếu muốn quản trị quyền sâu hơn.</p>
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
                      <strong>{gap.table}</strong>
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
                    Những bảng bên dưới cho biết role <strong>{activeBlueprint.label}</strong> sẽ ảnh hưởng tới module
                    nào trong nghiệp vụ.
                  </p>
                </div>
              </div>

              {relatedBusinessTables.length === 0 ? (
                <div className="admin-note-box">
                  <strong>Chưa suy ra được bảng business trực tiếp</strong>
                  <p>Role này hiện chủ yếu được nhận diện qua bridge table hoặc cần backend bổ sung scope rõ ràng hơn.</p>
                </div>
              ) : (
                <div className="admin-role-grid">
                  {relatedBusinessTables.map((tableInfo) => (
                    <div key={`${tableInfo.table}-${tableInfo.column}`} className="admin-role-card">
                      <AdminRoleBadge tone="info">{tableInfo.module}</AdminRoleBadge>
                      <strong className="mt-3">{tableInfo.table}</strong>
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
                  <h2 className="admin-card__title">Hướng mở rộng tiếp theo</h2>
                  <p className="admin-card__subtitle">Khi team backend bổ sung thêm bảng quản trị quyền, màn này có thể đi xa hơn.</p>
                </div>
              </div>

              <div className="admin-preview-list">
                <div className="admin-preview-list__item">
                  <strong>1. Permission catalog</strong>
                  <span>Thêm bảng `PERMISSION` để định nghĩa capability theo module và action.</span>
                </div>
                <div className="admin-preview-list__item">
                  <strong>2. Role permission bridge</strong>
                  <span>Thêm `ROLE_PERMISSION` để lưu checkbox phân quyền thật thay vì chỉ mô tả role blueprint.</span>
                </div>
                <div className="admin-preview-list__item">
                  <strong>3. Audit role change</strong>
                  <span>Thêm `ROLE_CHANGE_AUDIT` để khi admin đổi role có thể truy vết lại ở màn log.</span>
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
