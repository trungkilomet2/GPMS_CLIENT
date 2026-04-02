import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  FileText,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  AdminBanner,
  AdminRoleBadge,
  AdminSeverityBadge,
  AdminStatCard,
  formatAdminDateTime,
} from "@/pages/admin/adminShared";
import LogService from "@/services/LogService";

function normalizeSearchText(value = "") {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function toApiTimestamp(value = "") {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function toTimestampNumber(value = "") {
  const timestamp = toApiTimestamp(value);
  if (!timestamp) return null;

  const parsed = new Date(timestamp).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function extractPropertyValue(properties = "", key = "") {
  if (!properties || !key) return "";

  const escapedKey = String(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<property key='${escapedKey}'>([\\s\\S]*?)<\\/property>`, "i");
  const match = String(properties).match(pattern);
  if (!match) return "";

  return match[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLogItem(item = {}) {
  return {
    id: item.id ?? Math.random().toString(36).slice(2),
    message: String(item.message ?? "").trim(),
    messageTemplate: String(item.messageTemplate ?? "").trim(),
    level: String(item.level ?? "Information").trim(),
    timestamp: item.timeStemp ?? item.timeStamp ?? item.timestamp ?? item.createdAt ?? "",
    exception: String(item.exception ?? "").trim(),
    properties: String(item.properties ?? "").trim(),
    requestPath: extractPropertyValue(item.properties, "RequestPath"),
    actionName: extractPropertyValue(item.properties, "ActionName"),
    sourceContext: extractPropertyValue(item.properties, "SourceContext"),
    requestId: extractPropertyValue(item.properties, "RequestId"),
  };
}

function getLevelLabel(level = "") {
  const normalized = String(level).toLowerCase();
  if (normalized === "error") return "Lỗi";
  if (normalized === "warning") return "Cảnh báo";
  if (normalized === "debug") return "Debug";
  if (normalized === "trace") return "Trace";
  return level || "Thông tin";
}

function getLevelTone(level = "") {
  const normalized = String(level).toLowerCase();
  if (normalized === "error" || normalized === "fatal" || normalized === "critical") return "danger";
  if (normalized === "warning") return "warning";
  if (normalized === "debug" || normalized === "trace") return "info";
  return "success";
}

function isErrorLevel(level = "") {
  const normalized = String(level).toLowerCase();
  return ["error", "critical", "fatal"].includes(normalized);
}

function isWarningLevel(level = "") {
  return String(level).toLowerCase() === "warning";
}

export default function AdminSystemLog() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [fromTimestamp, setFromTimestamp] = useState("");
  const [toTimestamp, setToTimestamp] = useState("");
  const [logs, setLogs] = useState([]);
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(20);
  const [recordCount, setRecordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const levelOptions = useMemo(() => ["all", "Warning", "Error"], []);

  const loadLogs = async ({
    keepSelection = true,
  } = {}) => {
    try {
      setIsLoading(true);
      setError("");

      const response = await LogService.getAllPages({
        pageSize: 100,
        pageIndex: 0,
        sortColumn: "Name",
        sortOrder: "DESC",
      });

      const items = Array.isArray(response?.data) ? response.data.map(normalizeLogItem) : [];
      setLogs(items);
      setRecordCount(items.length);
      setSelectedLogId((current) => {
        if (items.length === 0) return null;
        if (keepSelection && items.some((item) => item.id === current)) {
          return current;
        }
        return items[0].id;
      });
    } catch (nextError) {
      setLogs([]);
      setSelectedLogId(null);
      setRecordCount(0);
      setError(
        nextError?.response?.data?.detail ||
        nextError?.response?.data?.message ||
        "Không thể tải nhật ký hệ thống từ backend."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const keyword = normalizeSearchText(search);
    const fromDate = toTimestampNumber(fromTimestamp);
    const toDate = toTimestampNumber(toTimestamp);

    return logs.filter((log) => {
      const logTime = new Date(log.timestamp).getTime();
      const isSupportedLevel = isWarningLevel(log.level) || isErrorLevel(log.level);
      const searchableText = normalizeSearchText([
        log.message,
        log.messageTemplate,
        log.level,
        log.requestPath,
        log.actionName,
        log.sourceContext,
        log.requestId,
        log.exception,
      ].filter(Boolean).join(" "));

      const searchMatch = !keyword || searchableText.includes(keyword);
      const levelMatch =
        levelFilter === "all"
          ? isSupportedLevel
          : levelFilter === "Warning"
            ? isWarningLevel(log.level)
            : isErrorLevel(log.level);
      const fromMatch = fromDate == null || (!Number.isNaN(logTime) && logTime >= fromDate);
      const toMatch = toDate == null || (!Number.isNaN(logTime) && logTime <= toDate);

      return isSupportedLevel && searchMatch && levelMatch && fromMatch && toMatch;
    });
  }, [fromTimestamp, levelFilter, logs, search, toTimestamp]);

  const paginatedLogs = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, pageIndex, pageSize]);

  const stats = useMemo(
    () => ({
      total: filteredLogs.length,
      errors: filteredLogs.filter((log) => isErrorLevel(log.level)).length,
      warnings: filteredLogs.filter((log) => isWarningLevel(log.level)).length,
      exceptions: filteredLogs.filter((log) => Boolean(log.exception)).length,
    }),
    [filteredLogs]
  );

  const selectedLog = useMemo(
    () => paginatedLogs.find((log) => log.id === selectedLogId) || paginatedLogs[0] || null,
    [paginatedLogs, selectedLogId]
  );

  useEffect(() => {
    const total = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
    if (pageIndex > total - 1) {
      setPageIndex(0);
      return;
    }

    setSelectedLogId((current) => {
      if (paginatedLogs.length === 0) return null;
      return paginatedLogs.some((log) => log.id === current) ? current : paginatedLogs[0].id;
    });
  }, [filteredLogs.length, pageIndex, pageSize, paginatedLogs]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const currentPage = pageIndex + 1;

  const applyFilters = () => {
    setPageIndex(0);
  };

  const clearFilters = () => {
    setSearch("");
    setLevelFilter("all");
    setFromTimestamp("");
    setToTimestamp("");
    setPageIndex(0);
  };

  return (
    <DashboardLayout>
      <div className="admin-page">
        <div className="admin-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="admin-hero">
            <div className="admin-hero__heading">
              <h1 className="admin-hero__title">Nhật ký hệ thống</h1>
              <p className="admin-hero__subtitle">
                Dùng log thật từ backend để kiểm tra lỗi vận hành, warning hạ tầng và những phần contract còn thiếu hoặc chưa validate chặt.
              </p>
            </div>

            <div className="admin-hero__actions">
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-focusable"
                onClick={() => loadLogs()}
                disabled={isLoading}
              >
                <RefreshCcw size={18} />
                Làm mới log
              </button>
            </div>
          </div>

          <AdminBanner
            title={
              isLoading
                ? "Đang tải nhật ký hệ thống từ backend."
                : error
                  ? "Không thể tải dữ liệu log."
                  : `Đã tải ${recordCount} log, đang hiển thị ${filteredLogs.length} log sau khi lọc.`
            }
            description={
              error ||
              "Màn này đang đọc trực tiếp từ API log thật, ưu tiên hiển thị rõ các lỗi và cảnh báo để Admin xử lý nhanh."
            }
            tone={error ? "warning" : stats.errors > 0 ? "warning" : "success"}
          />

          <div className="admin-stats-grid">
            <AdminStatCard icon={ClipboardList} label="Tổng bản ghi" value={isLoading ? "..." : stats.total} meta="Tổng số log backend trả về theo bộ lọc hiện tại" tone="primary" />
            <AdminStatCard icon={ShieldAlert} label="Log lỗi" value={isLoading ? "..." : stats.errors} meta="Các bản ghi mức Error trong trang đang xem" tone="danger" />
            <AdminStatCard icon={AlertTriangle} label="Cảnh báo" value={isLoading ? "..." : stats.warnings} meta="Các bản ghi mức Warning trong trang đang xem" tone="warning" />
            <AdminStatCard icon={ShieldCheck} label="Có exception" value={isLoading ? "..." : stats.exceptions} meta="Log có stack trace hoặc lỗi DB đi kèm" tone="info" />
          </div>

          <div className="admin-filter-card">
            <div className="admin-filter-grid admin-filter-grid--logs">
              <label className="admin-field admin-field--plain">
                <span className="admin-field__label">Tìm trong log</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Message, request path, action, lỗi..."
                  className="admin-field__control"
                />
              </label>

              <label className="admin-field admin-field--plain">
                <span className="admin-field__label">Mức độ</span>
                <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className="admin-field__control">
                  {levelOptions.map((level) => (
                    <option key={level} value={level}>
                      {level === "all" ? "Tất cả mức độ" : getLevelLabel(level)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field admin-field--plain">
                <span className="admin-field__label">Từ thời gian</span>
                <input
                  type="datetime-local"
                  value={fromTimestamp}
                  onChange={(event) => setFromTimestamp(event.target.value)}
                  className="admin-field__control"
                />
              </label>

              <label className="admin-field admin-field--plain">
                <span className="admin-field__label">Đến thời gian</span>
                <input
                  type="datetime-local"
                  value={toTimestamp}
                  onChange={(event) => setToTimestamp(event.target.value)}
                  className="admin-field__control"
                />
              </label>

              <div className="admin-filter-actions">
                <div className="admin-filter-info">
                  <ClipboardList size={16} />
                  <span>{filteredLogs.length} log phù hợp</span>
                </div>
                <button type="button" className="admin-filter-reset admin-focusable" onClick={applyFilters}>
                  Áp dụng
                </button>
                <button type="button" className="admin-filter-reset admin-focusable" onClick={clearFilters}>
                  Xóa
                </button>
              </div>
            </div>
          </div>

          <div className="admin-grid admin-grid--logs">
            <section className="admin-table-card">
              <div className="admin-table-card__header">
                <div>
                  <h2 className="admin-card__title">Danh sách log</h2>
                  <p className="admin-card__subtitle">Quét nhanh theo thời gian, mức độ và request path.</p>
                </div>
                <div className="admin-inline-summary">
                  <span className="admin-inline-summary__item">{filteredLogs.length} log phù hợp</span>
                  <span className="admin-inline-summary__item">{stats.errors} lỗi</span>
                </div>
              </div>

              <div className="admin-table-wrap">
                {!isLoading && filteredLogs.length === 0 ? (
                  <div className="admin-state">
                    <div className="admin-state__content">
                      <strong>Không có log phù hợp</strong>
                      <span>Thử đổi thời gian, từ khóa hoặc mức độ để xem thêm dữ liệu từ backend.</span>
                    </div>
                  </div>
                ) : (
                  <table className="admin-table admin-log-table">
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Mức độ</th>
                        <th>Request path</th>
                        <th>Nội dung</th>
                        <th>Nguồn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLogs.map((log) => {
                        const isSelected = selectedLog?.id === log.id;

                        return (
                          <tr
                            key={log.id}
                            className={isSelected ? "admin-log-table__row is-selected" : "admin-log-table__row"}
                            onClick={() => setSelectedLogId(log.id)}
                          >
                            <td>
                              <div className="admin-table__primary">{formatAdminDateTime(log.timestamp)}</div>
                              <div className="admin-table__secondary">#{log.id}</div>
                            </td>
                            <td>
                              <AdminSeverityBadge severity={String(log.level).toLowerCase()} />
                            </td>
                            <td>
                              <div className="admin-table__primary admin-table__text-wrap">
                                {log.requestPath || "Chưa có RequestPath"}
                              </div>
                            </td>
                            <td>
                              <div className="admin-table__primary admin-table__text-wrap">
                                {log.message || "Không có message"}
                              </div>
                            </td>
                            <td>
                              <div className="admin-table__secondary admin-table__text-wrap">
                                {log.sourceContext || "Chưa có SourceContext"}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="admin-table-card__header admin-table-card__footer">
                <div className="admin-card__subtitle">
                  Trang {currentPage}/{totalPages} • Tối đa {pageSize} log mỗi trang
                </div>
                <div className="admin-table__actions">
                  <button
                    type="button"
                    className="admin-link-btn admin-link-btn--secondary"
                    disabled={pageIndex === 0 || isLoading}
                    onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                  >
                    Trang trước
                  </button>
                  <button
                    type="button"
                    className="admin-link-btn admin-link-btn--primary"
                    disabled={currentPage >= totalPages || isLoading}
                    onClick={() => setPageIndex((current) => current + 1)}
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            </section>

            <aside className="admin-card">
              <div className="admin-card__header">
                <div>
                  <h2 className="admin-card__title">Chi tiết log</h2>
                  <p className="admin-card__subtitle">Chọn một dòng bên trái để xem đầy đủ message, request và exception.</p>
                </div>
              </div>

              {!selectedLog ? (
                <div className="admin-state admin-state--compact">
                  <div className="admin-state__content">
                    <strong>Chưa có log nào được chọn</strong>
                    <span>Chọn một dòng trong bảng để xem chi tiết tại đây.</span>
                  </div>
                </div>
              ) : (
                <div className="admin-log-detail">
                  <div className="admin-chips">
                    <AdminSeverityBadge severity={String(selectedLog.level).toLowerCase()} />
                    <span className="admin-badge admin-badge--tone-info">#{selectedLog.id}</span>
                  </div>

                  <div className="admin-log-detail__section">
                    <strong>Thời gian</strong>
                    <span>{formatAdminDateTime(selectedLog.timestamp)}</span>
                  </div>

                  <div className="admin-log-detail__section">
                    <strong>Request path</strong>
                    <span>{selectedLog.requestPath || "Chưa có RequestPath"}</span>
                  </div>

                  <div className="admin-log-detail__section">
                    <strong>Action</strong>
                    <span>{selectedLog.actionName || "Chưa có ActionName"}</span>
                  </div>

                  <div className="admin-log-detail__section">
                    <strong>Source</strong>
                    <span>{selectedLog.sourceContext || "Chưa có SourceContext"}</span>
                  </div>

                  <div className="admin-log-detail__section">
                    <strong>Request ID</strong>
                    <span>{selectedLog.requestId || "Chưa có RequestId"}</span>
                  </div>

                  <div className="admin-log-detail__section">
                    <strong>Nội dung log</strong>
                    <div className="admin-log-detail__message">{selectedLog.message || "Không có message."}</div>
                  </div>

                  {selectedLog.messageTemplate ? (
                    <div className="admin-log-detail__section">
                      <strong>Message template</strong>
                      <div className="admin-log-detail__code">{selectedLog.messageTemplate}</div>
                    </div>
                  ) : null}

                  {selectedLog.exception ? (
                    <div className="admin-log-detail__section">
                      <strong>Exception</strong>
                      <pre className="admin-log-detail__exception">{selectedLog.exception}</pre>
                    </div>
                  ) : null}

                  {selectedLog.properties ? (
                    <div className="admin-log-detail__section">
                      <strong>Properties gốc</strong>
                      <div className="admin-log-detail__code admin-log-detail__code--scroll">
                        <FileText size={16} />
                        <span>{selectedLog.properties}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
