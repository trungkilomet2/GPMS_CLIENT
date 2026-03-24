import { useMemo, useState } from "react";
import {
  ClipboardList,
  Search,
  ShieldCheck,
  Table2,
  Users,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  ADMIN_DB_LOG_SOURCES,
  ADMIN_DB_SYSTEM_LOG_EVENTS,
  getAdminDbLogSource,
} from "@/lib/admin/adminSchemaBlueprint";
import {
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
              <h1 className="admin-hero__title">Màn hình nhật ký hệ thống</h1>
              <p className="admin-hero__subtitle">
                Màn này tổng hợp các nguồn log hiện có trong hệ thống để Admin theo dõi nhanh.
              </p>
            </div>
          </div>

        

          <div className="admin-stats-grid">
            <AdminStatCard icon={ClipboardList} label="Nguồn log hiện có" value={stats.sources} meta="Các bảng log và luồng xử lý đang sử dụng" tone="primary" />
            <AdminStatCard icon={Users} label="Có USER_ID" value={stats.actorBound} meta="Nguồn có thể lần ra user trực tiếp" tone="success" />
            <AdminStatCard icon={ShieldCheck} label="Có trạng thái" value={stats.paymentAware} meta="Nguồn có lưu trạng thái xử lý" tone="info" />
          </div>

          <div className="admin-filter-card">
            <div className="admin-filter-grid">
              <label className="admin-field">
                <span className="admin-field__label">Tìm trong feed</span>
                <Search size={18} className="admin-field__icon" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Bảng, thao tác, đối tượng, cột dữ liệu..."
                  className="admin-field__control"
                />
              </label>

              <label className="admin-field">
                <span className="admin-field__label">Bảng nguồn</span>
                <Table2 size={18} className="admin-field__icon" />
                <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="admin-field__control">
                  {sourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {source === "all" ? "Tất cả bảng nguồn" : source}
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
                <span className="admin-field__label">Dấu vết người thực hiện</span>
                <Users size={18} className="admin-field__icon" />
                <select value={actorFilter} onChange={(event) => setActorFilter(event.target.value)} className="admin-field__control">
                  <option value="all">Tất cả</option>
                  <option value="user">Có USER_ID</option>
                  <option value="missing">Không có actor trực tiếp</option>
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
                <h2 className="admin-card__title">Danh sách nhật ký hoạt động</h2>
                <p className="admin-card__subtitle">Danh sách sự kiện để Admin theo dõi nhanh các hoạt động trong hệ thống.</p>
              </div>
            </div>

            <div className="admin-table-wrap">
              {filteredLogs.length === 0 ? (
                <div className="admin-state">
                  <div className="admin-state__content">
                    <strong>Không có sự kiện phù hợp với bộ lọc hiện tại</strong>
                    <span>Thử đổi bộ lọc để xem thêm các nguồn log hiện có trong hệ thống.</span>
                  </div>
                </div>
              ) : (
                <table className="admin-table admin-log-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Nguồn</th>
                      <th>Thao tác</th>
                      <th>Đối tượng</th>
                      <th>Người thực hiện</th>
                      <th>Ghi chú</th>
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
                              <AdminRoleBadge tone={source?.tone || "primary"}>{source?.actorLabel || "Nguồn log"}</AdminRoleBadge>
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
                                {hasActor ? "Có actor trực tiếp" : "Không có actor trực tiếp"}
                              </AdminRoleBadge>
                            </div>
                          </td>
                          <td>
                            <div className="admin-table__secondary">{source?.description}</div>
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
                  <h2 className="admin-card__title">Nguồn dữ liệu log</h2>
                  <p className="admin-card__subtitle">Mỗi card bên dưới thể hiện một nguồn dữ liệu đang được dùng để hiển thị log.</p>
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
                        <strong>Cột thời gian</strong>
                        <span>{source.timeColumn}</span>
                      </div>
                      <div className="admin-preview-list__item">
                        <strong>Dấu vết người thực hiện</strong>
                        <span>{source.actorLabel}</span>
                      </div>
                    </div>
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
