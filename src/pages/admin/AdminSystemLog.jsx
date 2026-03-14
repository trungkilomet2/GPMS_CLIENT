import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ClipboardList,
  Search,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Users,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  ADMIN_LOG_OUTCOME_META,
  ADMIN_LOG_SEVERITY_META,
  getAdminLogs,
  getAdminUserById,
} from "@/lib/admin/adminMockStore";
import {
  AdminBanner,
  AdminOutcomeBadge,
  AdminSeverityBadge,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const relatedTo = searchParams.get("relatedTo") || "";
  const relatedUser = relatedTo ? getAdminUserById(relatedTo) : null;
  const [logs] = useState(() => getAdminLogs());
  const [search, setSearch] = useState(() => relatedUser?.fullName || "");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");

  const moduleOptions = useMemo(
    () => ["all", ...new Set(logs.map((log) => log.moduleLabel))],
    [logs]
  );

  const filteredLogs = useMemo(() => {
    const keyword = normalizeSearchText(search);

    return logs.filter((log) => {
      const searchableText = normalizeSearchText(
        [
          log.action,
          log.actorName,
          log.actorUserName,
          log.targetLabel,
          log.description,
          log.ipAddress,
        ]
          .filter(Boolean)
          .join(" ")
      );

      const relatedMatch =
        !relatedTo || log.actorUserId === relatedTo || log.targetId === relatedTo;
      const searchMatch = !keyword || searchableText.includes(keyword);
      const severityMatch = severityFilter === "all" || log.severity === severityFilter;
      const moduleMatch = moduleFilter === "all" || log.moduleLabel === moduleFilter;
      const outcomeMatch = outcomeFilter === "all" || log.outcome === outcomeFilter;

      return relatedMatch && searchMatch && severityMatch && moduleMatch && outcomeMatch;
    });
  }, [logs, moduleFilter, outcomeFilter, relatedTo, search, severityFilter]);

  const stats = useMemo(() => {
    const total = logs.length;
    const critical = logs.filter((log) => log.severity === "critical").length;
    const permissionChanges = logs.filter((log) => log.moduleKey === "permissions").length;
    const failedAttempts = logs.filter((log) => log.outcome === "failed").length;

    return { total, critical, permissionChanges, failedAttempts };
  }, [logs]);

  const clearFilters = () => {
    setSearch(relatedUser?.fullName || "");
    setSeverityFilter("all");
    setModuleFilter("all");
    setOutcomeFilter("all");
  };

  const clearRelatedFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("relatedTo");
    setSearchParams(next);
  };

  return (
    <DashboardLayout>
      <div className="admin-page">
        <div className="admin-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="admin-hero">
            <div className="admin-hero__heading">
              <h1 className="admin-hero__title">View System Log Screen</h1>
              <p className="admin-hero__subtitle">
                Màn audit dành cho Admin để tra cứu hoạt động bất thường, theo dõi thay đổi quyền, và lần ngược thao tác của từng user.
              </p>
            </div>
          </div>

          {relatedUser ? (
            <AdminBanner
              title={`Đang lọc log liên quan tới ${relatedUser.fullName}.`}
              description="Bạn có thể bỏ bộ lọc liên quan để quay về toàn bộ nhật ký hệ thống."
              tone="info"
            />
          ) : null}

          <div className="admin-stats-grid">
            <AdminStatCard icon={ClipboardList} label="Tổng sự kiện" value={stats.total} meta="Toàn bộ log trong dataset admin demo" tone="primary" />
            <AdminStatCard icon={Siren} label="Critical" value={stats.critical} meta="Các sự kiện cần điều tra ngay" tone="danger" />
            <AdminStatCard icon={ShieldCheck} label="Thay đổi quyền" value={stats.permissionChanges} meta="Những event liên quan đến permission" tone="warning" />
            <AdminStatCard icon={ShieldAlert} label="Thất bại" value={stats.failedAttempts} meta="Đăng nhập hoặc thao tác không thành công" tone="info" />
          </div>

          <div className="admin-filter-card">
            <div className="admin-filter-grid">
              <label className="admin-field">
                <span className="admin-field__label">Tìm trong log</span>
                <Search size={18} className="admin-field__icon" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Action, actor, IP, target..."
                  className="admin-field__control"
                />
              </label>

              <label className="admin-field">
                <span className="admin-field__label">Severity</span>
                <Siren size={18} className="admin-field__icon" />
                <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} className="admin-field__control">
                  <option value="all">Tất cả severity</option>
                  {Object.entries(ADMIN_LOG_SEVERITY_META).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
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
                <span className="admin-field__label">Outcome</span>
                <ShieldCheck size={18} className="admin-field__icon" />
                <select value={outcomeFilter} onChange={(event) => setOutcomeFilter(event.target.value)} className="admin-field__control">
                  <option value="all">Tất cả outcome</option>
                  {Object.entries(ADMIN_LOG_OUTCOME_META).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="admin-filter-actions">
                <div className="admin-filter-info">
                  <Users size={16} />
                  <span>{filteredLogs.length} kết quả</span>
                </div>
                <button type="button" className="admin-filter-reset admin-focusable" onClick={clearFilters}>
                  Xóa bộ lọc
                </button>
                {relatedUser ? (
                  <button type="button" className="admin-filter-reset admin-focusable" onClick={clearRelatedFilter}>
                    Bỏ lọc theo user
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="admin-table-card">
            <div className="admin-table-card__header">
              <div>
                <h2 className="admin-card__title">System log feed</h2>
                <p className="admin-card__subtitle">Sắp xếp mới nhất lên đầu để Admin tra cứu nhanh các sự kiện nóng.</p>
              </div>
            </div>

            <div className="admin-table-wrap">
              {filteredLogs.length === 0 ? (
                <div className="admin-state">
                  <div className="admin-state__content">
                    <strong>Không có log phù hợp với bộ lọc hiện tại</strong>
                    <span>Thử đổi severity hoặc module để mở rộng phạm vi audit.</span>
                  </div>
                </div>
              ) : (
                <table className="admin-table admin-log-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Action</th>
                      <th>Actor</th>
                      <th>Module</th>
                      <th>Severity</th>
                      <th>Outcome</th>
                      <th>IP / Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <div className="admin-table__primary">{formatAdminDateTime(log.timestamp)}</div>
                          <div className="admin-table__secondary">{log.id}</div>
                        </td>
                        <td>
                          <div className="admin-table__primary">{log.action}</div>
                          <div className="admin-table__secondary">{log.description}</div>
                        </td>
                        <td>
                          <div className="admin-table__primary">{log.actorName}</div>
                          <div className="admin-table__secondary">@{log.actorUserName}</div>
                        </td>
                        <td>
                          <div className="admin-table__primary">{log.moduleLabel}</div>
                        </td>
                        <td>
                          <AdminSeverityBadge severity={log.severity} />
                        </td>
                        <td>
                          <AdminOutcomeBadge outcome={log.outcome} />
                        </td>
                        <td>
                          <div className="admin-table__primary">{log.ipAddress}</div>
                          <div className="admin-table__secondary">{log.targetLabel}</div>
                          {String(log.targetId).startsWith("USR-") ? (
                            <div className="mt-2">
                              <Link to={`/admin/users/${log.targetId}`} className="admin-link-btn admin-link-btn--secondary">
                                View User
                              </Link>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
