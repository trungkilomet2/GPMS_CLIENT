import { useMemo, useState } from "react";
import {
  ClipboardList,
  Search,
  ShieldAlert,
  ShieldCheck,
  Table2,
  Users,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  ADMIN_DB_LOG_GAPS,
  ADMIN_DB_LOG_SOURCES,
  ADMIN_DB_SCHEMA_VERSION,
  ADMIN_DB_SYSTEM_LOG_EVENTS,
  getAdminDbLogSource,
} from "@/lib/admin/adminSchemaBlueprint";
import {
  AdminBanner,
  AdminRoleBadge,
  AdminStatCard,
  formatAdminDateTime,
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

export default function AdminSystemLog() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");

  const sourceOptions = useMemo(
    () => ["all", ...ADMIN_DB_LOG_SOURCES.map((source) => source.table)],
    []
  );

  const moduleOptions = useMemo(
    () => ["all", ...new Set(ADMIN_DB_LOG_SOURCES.map((source) => source.moduleLabel))],
    []
  );

  const filteredLogs = useMemo(() => {
    const keyword = normalizeSearchText(search);

    return ADMIN_DB_SYSTEM_LOG_EVENTS.filter((log) => {
      const searchableText = normalizeSearchText(
        [
          log.sourceTable,
          log.moduleLabel,
          log.action,
          log.entityLabel,
          log.actorLabel,
          log.actorTrace,
          log.detail,
          ...(log.flags || []),
        ]
          .filter(Boolean)
          .join(" ")
      );

      const source = getAdminDbLogSource(log.sourceKey);
      const hasActor = source?.actorMode === "user";

      const searchMatch = !keyword || searchableText.includes(keyword);
      const sourceMatch = sourceFilter === "all" || log.sourceTable === sourceFilter;
      const moduleMatch = moduleFilter === "all" || log.moduleLabel === moduleFilter;
      const actorMatch =
        actorFilter === "all" ||
        (actorFilter === "user" && hasActor) ||
        (actorFilter === "missing" && !hasActor);

      return searchMatch && sourceMatch && moduleMatch && actorMatch;
    });
  }, [actorFilter, moduleFilter, search, sourceFilter]);

  const stats = useMemo(
    () => ({
      sources: ADMIN_DB_LOG_SOURCES.length,
      actorBound: ADMIN_DB_LOG_SOURCES.filter((source) => source.actorMode === "user").length,
      paymentAware: ADMIN_DB_LOG_SOURCES.filter((source) =>
        source.flags.some((flag) => flag === "IS_PAYMENT" || flag === "IS_READ_ONLY")
      ).length,
      securityGaps: ADMIN_DB_LOG_GAPS.length,
    }),
    []
  );

  const clearFilters = () => {
    setSearch("");
    setSourceFilter("all");
    setModuleFilter("all");
    setActorFilter("all");
  };

  return (
    <DashboardLayout>
      <div className="admin-page">
        <div className="admin-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="admin-hero">
            <div className="admin-hero__heading">
              <h1 className="admin-hero__title">View System Log Screen</h1>
              <p className="admin-hero__subtitle">
                Thiết kế lại màn log cho Admin dựa trên schema {ADMIN_DB_SCHEMA_VERSION}. Vì database hiện chưa có bảng
                `SYSTEM_LOG` riêng, màn này tổng hợp các bảng log và workflow thật đang tồn tại trong DB để Admin review
                trước luồng audit API.
              </p>
            </div>
          </div>

          <AdminBanner
            title="Schema hiện chưa có security log hoặc IP audit riêng."
            description="Không có `SYSTEM_LOG`, `LOGIN_AUDIT` hay `IP_TRACKING` trong V1.1.sql. Vì vậy màn này tập trung vào các nguồn log nghiệp vụ như reject reason, work log và history update."
            tone="warning"
          />

          <div className="admin-stats-grid">
            <AdminStatCard icon={ClipboardList} label="Nguồn log khả dụng" value={stats.sources} meta="Bảng log/workflow có thể dùng để dựng màn audit" tone="primary" />
            <AdminStatCard icon={Users} label="Có USER_ID actor" value={stats.actorBound} meta="Nguồn có thể lần ngược user trực tiếp từ schema" tone="success" />
            <AdminStatCard icon={ShieldCheck} label="Có cờ state" value={stats.paymentAware} meta="Nguồn lưu IS_PAYMENT hoặc IS_READ_ONLY" tone="info" />
            <AdminStatCard icon={ShieldAlert} label="Security gaps" value={stats.securityGaps} meta="Khoảng trống cần backend bổ sung nếu muốn có audit chuẩn" tone="danger" />
          </div>

          <div className="admin-filter-card">
            <div className="admin-filter-grid">
              <label className="admin-field">
                <span className="admin-field__label">Tìm trong feed</span>
                <Search size={18} className="admin-field__icon" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Table, action, entity, cột dữ liệu..."
                  className="admin-field__control"
                />
              </label>

              <label className="admin-field">
                <span className="admin-field__label">Source table</span>
                <Table2 size={18} className="admin-field__icon" />
                <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="admin-field__control">
                  {sourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {source === "all" ? "Tất cả source" : source}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span className="admin-field__label">Module</span>
                <ClipboardList size={18} className="admin-field__icon" />
                <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} className="admin-field__control">
                  {moduleOptions.map((moduleName) => (
                    <option key={moduleName} value={moduleName}>
                      {moduleName === "all" ? "Tất cả module" : moduleName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span className="admin-field__label">Actor trace</span>
                <Users size={18} className="admin-field__icon" />
                <select value={actorFilter} onChange={(event) => setActorFilter(event.target.value)} className="admin-field__control">
                  <option value="all">Tất cả</option>
                  <option value="user">Có USER_ID</option>
                  <option value="missing">Thiếu actor trực tiếp</option>
                </select>
              </label>

              <div className="admin-filter-actions">
                <div className="admin-filter-info">
                  <Users size={16} />
                  <span>{filteredLogs.length} sự kiện mẫu</span>
                </div>
                <button type="button" className="admin-filter-reset admin-focusable" onClick={clearFilters}>
                  Xóa bộ lọc
                </button>
              </div>
            </div>
          </div>

          <div className="admin-table-card">
            <div className="admin-table-card__header">
              <div>
                <h2 className="admin-card__title">Operational log feed</h2>
                <p className="admin-card__subtitle">
                  Feed dưới đây là mẫu tổng hợp theo những cột có thật trong schema, không phải dataset audit bảo mật hoàn chỉnh.
                </p>
              </div>
            </div>

            <div className="admin-table-wrap">
              {filteredLogs.length === 0 ? (
                <div className="admin-state">
                  <div className="admin-state__content">
                    <strong>Không có sự kiện phù hợp với bộ lọc hiện tại</strong>
                    <span>Thử đổi source table hoặc actor trace để xem đầy đủ các bảng log khả dụng trong schema.</span>
                  </div>
                </div>
              ) : (
                <table className="admin-table admin-log-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Nguồn</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Actor mapping</th>
                      <th>Schema note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => {
                      const source = getAdminDbLogSource(log.sourceKey);
                      const hasActor = source?.actorMode === "user";

                      return (
                        <tr key={log.id}>
                          <td>
                            <div className="admin-table__primary">{formatAdminDateTime(log.timestamp)}</div>
                            <div className="admin-table__secondary">{log.id}</div>
                          </td>
                          <td>
                            <div className="admin-table__primary">{log.sourceTable}</div>
                            <div className="admin-table__secondary">{log.moduleLabel}</div>
                            <div className="admin-chips mt-2">
                              <AdminRoleBadge tone={source?.tone || "primary"}>{source?.actorLabel || "Schema source"}</AdminRoleBadge>
                            </div>
                          </td>
                          <td>
                            <div className="admin-table__primary">{log.action}</div>
                            <div className="admin-table__secondary">{log.detail}</div>
                          </td>
                          <td>
                            <div className="admin-table__primary">{log.entityLabel}</div>
                          </td>
                          <td>
                            <div className="admin-table__primary">{log.actorLabel}</div>
                            <div className="admin-table__secondary">{log.actorTrace}</div>
                            <div className="admin-chips mt-2">
                              <AdminRoleBadge tone={hasActor ? "success" : "warning"}>
                                {hasActor ? "Có actor trực tiếp" : "Thiếu actor trực tiếp"}
                              </AdminRoleBadge>
                            </div>
                          </td>
                          <td>
                            <div className="admin-table__secondary">{source?.description}</div>
                            {log.flags?.length ? (
                              <div className="admin-chips mt-2">
                                {log.flags.map((flag) => (
                                  <AdminRoleBadge key={flag} tone="info">
                                    {flag}
                                  </AdminRoleBadge>
                                ))}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="admin-grid admin-grid--permissions">
            <section className="admin-card">
              <div className="admin-card__header">
                <div>
                  <h2 className="admin-card__title">Các bảng log có trong schema</h2>
                  <p className="admin-card__subtitle">Mỗi card bên dưới thể hiện chính xác bảng nào trong DB đang có thể dùng để dựng audit feed.</p>
                </div>
              </div>

              <div className="admin-role-grid">
                {ADMIN_DB_LOG_SOURCES.map((source) => (
                  <div key={source.key} className="admin-role-card">
                    <AdminRoleBadge tone={source.tone}>{source.table}</AdminRoleBadge>
                    <strong className="mt-3">{source.moduleLabel}</strong>
                    <span>{source.description}</span>
                    <div className="admin-preview-list mt-3">
                      <div className="admin-preview-list__item">
                        <strong>Time column</strong>
                        <span>{source.timeColumn}</span>
                      </div>
                      <div className="admin-preview-list__item">
                        <strong>Actor trace</strong>
                        <span>{source.actorLabel}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-card">
              <div className="admin-card__header">
                <div>
                  <h2 className="admin-card__title">Khoảng trống audit</h2>
                  <p className="admin-card__subtitle">Những phần DB hiện chưa có nên web chưa thể hiện đúng security log chuẩn.</p>
                </div>
              </div>

              <div className="admin-preview-list">
                {ADMIN_DB_LOG_GAPS.map((gap) => (
                  <div key={gap.table} className="admin-preview-list__item">
                    <strong>{gap.table}</strong>
                    <span>{gap.impact}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
