import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  CalendarRange,
  CheckCircle2,
  CircleAlert,
  Download,
  Eye,
  FileText,
  LoaderCircle,
  Search,
  Users,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  PAYROLL_PAGE_SIZE,
  downloadPayrollCsv,
  formatCurrency,
  getCurrentMonthValue,
  formatMonthLabel,
  getLatestPayrollMonth,
  getPayrollInitials,
  getPayrollMonths,
  getPayrollRecordsByMonth,
  getPayrollSummary,
  normalizeSearchText,
} from "@/lib/payroll";
import PayrollPreviewService from "@/services/PayrollPreviewService";
import "@/styles/payroll.css";

const STATUS_META = {
  paid: {
    label: "Đã đánh dấu thanh toán",
    className: "payroll-status payroll-status--paid",
  },
  pending: {
    label: "Tạm tính",
    className: "payroll-status payroll-status--pending",
  },
};

function SummaryCard({ icon: Icon, label, value, meta, tone }) {
  return (
    <div className={`payroll-summary-card payroll-summary-card--${tone}`}>
      <span className="payroll-summary-card__glow" aria-hidden="true" />
      <div className="payroll-summary-card__top">
        <div>
          <p className="payroll-summary-card__label">{label}</p>
          <div className="payroll-summary-card__value">{value}</div>
        </div>
        <div className="payroll-summary-card__icon">
          <Icon size={22} />
        </div>
      </div>
      <div className="payroll-summary-card__footer">
        <p className="payroll-summary-card__meta">{meta}</p>
      </div>
    </div>
  );
}

export default function PayrollList() {
  const [searchParams] = useSearchParams();
  const monthFromQuery = searchParams.get("month");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingKey, setSubmittingKey] = useState("");
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    monthFromQuery && monthFromQuery.length === 7
      ? monthFromQuery
      : getCurrentMonthValue()
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const monthOptions = useMemo(() => getPayrollMonths(records), [records]);
  const hasPayrollData = monthOptions.length > 0;

  useEffect(() => {
    let active = true;

    const fetchPayrollPreview = async () => {
      try {
        setLoading(true);
        setError("");
        const nextRecords = await PayrollPreviewService.getPayrollPreviewRecords();
        if (!active) return;
        setRecords(nextRecords);
      } catch (_err) {
        if (!active) return;
        setRecords([]);
        setError("Không thể tải bảng lương tạm tính từ dữ liệu sản lượng hiện có.");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchPayrollPreview();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!monthFromQuery || monthFromQuery.length !== 7) return;
    if (monthFromQuery !== selectedMonth) {
      setSelectedMonth(monthFromQuery);
    }
  }, [monthFromQuery, selectedMonth]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedMonth, statusFilter]);

  const monthRecords = useMemo(() => (
    getPayrollRecordsByMonth(records, selectedMonth)
      .slice()
      .sort((recordA, recordB) => recordB.netIncome - recordA.netIncome)
  ), [records, selectedMonth]);

  const filteredRecords = useMemo(() => {
    const keyword = normalizeSearchText(search);

    return monthRecords.filter((record) => {
      const haystack = normalizeSearchText(
        [record.employeeCode, record.fullName, record.team].join(" ")
      );
      const matchesSearch = !keyword || haystack.includes(keyword);
      const matchesStatus =
        statusFilter === "all" || record.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [monthRecords, search, statusFilter]);

  const summary = useMemo(() => getPayrollSummary(records, selectedMonth), [records, selectedMonth]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRecords.length / PAYROLL_PAGE_SIZE)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * PAYROLL_PAGE_SIZE;
  const paginatedRecords = filteredRecords.slice(
    pageStart,
    pageStart + PAYROLL_PAGE_SIZE
  );
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
  const hasFilters = Boolean(search.trim()) || statusFilter !== "all";
  const comparisonText =
    typeof summary.totalChange === "number" && summary.previousMonth
      ? `${summary.totalChange >= 0 ? "+" : ""}${summary.totalChange.toFixed(
          1
        )}% so với ${formatMonthLabel(summary.previousMonth)}`
      : "Chưa có dữ liệu tháng trước";
  const pendingText = summary.pendingCount
    ? `${summary.pendingCount} bảng lương cần xử lý ngay`
    : "Tất cả bảng lương đã hoàn tất";
  const employeeText = summary.newEmployeeCount
    ? `${summary.newEmployeeCount} nhân viên mới trong kỳ này`
    : "Không có nhân sự mới phát sinh";
  const activeFilterLabel =
    statusFilter === "all"
      ? "Tất cả trạng thái"
      : statusFilter === "paid"
        ? "Đã thanh toán"
        : "Chờ xử lý";
  const rangeStart = filteredRecords.length === 0 ? 0 : pageStart + 1;
  const rangeEnd = Math.min(pageStart + PAYROLL_PAGE_SIZE, filteredRecords.length);

  const handleExportList = () => {
    downloadPayrollCsv(filteredRecords, selectedMonth);
  };

  const handleExportRow = (record) => {
    downloadPayrollCsv(
      [record],
      selectedMonth,
      `phieu-luong-${record.employeeCode.toLowerCase()}-${selectedMonth}.csv`
    );
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const handleMarkAsPaid = async (record) => {
    if (!record || record.status === "paid") return;

    const recordKey = `${record.employeeId}-${record.month}`;

    try {
      setSubmittingKey(recordKey);
      setError("");
      const nextRecords = await PayrollPreviewService.markPayrollAsPaid(
        record.employeeId,
        record.month
      );
      setRecords(nextRecords);
    } catch (_err) {
      setError(`Không thể cập nhật thanh toán cho ${record.fullName}.`);
    } finally {
      setSubmittingKey("");
    }
  };

  return (
    <DashboardLayout>
      <div className="payroll-page payroll-page--list">
        <div className="payroll-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="payroll-hero payroll-hero--list">
            <div className="payroll-hero__panel">
              <div className="payroll-hero__content">
                <Link to="/dashboard" className="payroll-hero__back">
                  <ArrowLeft size={20} />
                  <span>Quay lại dashboard</span>
                </Link>
                <h1 className="payroll-hero__title">Bảng lương tạm tính</h1>
                <p className="payroll-hero__subtitle">
                  Tạm tính tiền công theo sản lượng đầu ra do worker xác nhận nhân với đơn giá `cpu` của từng công đoạn.
                </p>

                {hasPayrollData ? (
                  <div className="payroll-hero__chips">
                    <div className="payroll-hero-chip">
                      <span>Kỳ đang xem</span>
                      <strong>{formatMonthLabel(selectedMonth)}</strong>
                    </div>
                    <div className="payroll-hero-chip">
                      <span>Đang hiển thị</span>
                      <strong>{filteredRecords.length} hồ sơ</strong>
                    </div>
                    <div className="payroll-hero-chip">
                      <span>Cần xử lý</span>
                      <strong>{summary.pendingCount} hồ sơ</strong>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="payroll-hero__aside">
                <label className="payroll-month-picker">
                  <CalendarRange size={18} />
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    aria-label="Chọn kỳ lương"
                  />
                </label>

                <div className="payroll-hero__period-card">
                  <span className="payroll-hero__period-label">Tổng quan kỳ lương</span>
                  <strong className="payroll-hero__period-value">
                    {hasPayrollData ? formatMonthLabel(selectedMonth) : "Chưa có dữ liệu"}
                  </strong>
                  <p className="payroll-hero__period-meta">
                    {hasPayrollData
                      ? `${summary.payrollCreated} bảng tạm tính được suy ra từ work log hiện có, ${summary.paidCount} bảng đã có toàn bộ log đánh dấu thanh toán.`
                      : "Chưa có dữ liệu work log phù hợp để suy ra bảng lương tạm tính."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="payroll-state">
              <LoaderCircle size={20} className="employee-table-state__spin" />
              <div className="payroll-empty__content">
                <strong>Đang tổng hợp bảng lương tạm tính</strong>
                <span>Hệ thống đang gom production, công đoạn và work log để tính `quantity x cpu`.</span>
              </div>
            </div>
          ) : error ? (
            <div className="payroll-state payroll-state--error">
              <CircleAlert size={20} />
              <div className="payroll-empty__content">
                <strong>Không tải được bảng lương tạm tính</strong>
                <span>{error}</span>
              </div>
            </div>
          ) : hasPayrollData ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                icon={BadgeDollarSign}
                label="Tổng tạm tính tháng"
                value={formatCurrency(summary.totalPayroll)}
                meta={comparisonText}
                tone="primary"
              />
              <SummaryCard
                icon={FileText}
                label="Bảng tạm tính"
                value={summary.payrollCreated}
                meta={`${summary.paidCount} bảng đã có log thanh toán`}
                tone="info"
              />
              <SummaryCard
                icon={AlertTriangle}
                label="Chưa chốt"
                value={summary.pendingCount}
                meta={pendingText}
                tone="warning"
              />
              <SummaryCard
                icon={Users}
                label="Số nhân viên"
                value={summary.employeeCount}
                meta={employeeText}
                tone="accent"
              />
            </div>
          ) : null}

          <div className="payroll-summary-note">
            <strong>Kỳ lương tổng quan</strong>
              <span>
                {hasPayrollData
                ? "Dữ liệu này là bản tạm tính từ get-work-logs của từng công đoạn kết hợp đơn giá cpu, chưa thay thế cho payroll backend chính thức."
                : "Chưa có dữ liệu work log phù hợp nên hệ thống không hiển thị số liệu mẫu."}
              </span>
          </div>

          <section className="payroll-card">
            <div className="payroll-table-card__header">
              <div className="payroll-table-card__intro">
                <span className="payroll-table-card__eyebrow">Danh sách chi trả</span>
                <h2 className="payroll-table-card__title">Danh sách bảng lương tạm tính</h2>
                <p className="payroll-table-card__subtitle">
                  Theo dõi tiền công tạm tính theo từng nhân viên từ dữ liệu `quantity x cpu`.
                </p>
                <div className="payroll-table-card__insights">
                  <span className="payroll-table-card__insight">
                    {filteredRecords.length} hồ sơ phù hợp
                  </span>
                  <span className="payroll-table-card__insight">
                    Bộ lọc: {activeFilterLabel}
                  </span>
                </div>
              </div>

              <div className="payroll-toolbar">
                <label className="payroll-search">
                  <Search size={18} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm kiếm nhân viên..."
                    aria-label="Tìm kiếm nhân viên"
                  />
                </label>

                <label className="payroll-filter">
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    aria-label="Lọc theo trạng thái"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="paid">Đã thanh toán</option>
                    <option value="pending">Chờ xử lý</option>
                  </select>
                </label>

                <button
                  type="button"
                  className="payroll-toolbar__button"
                  onClick={handleExportList}
                  disabled={!filteredRecords.length}
                >
                  <Download size={16} />
                  <span>Xuất Excel</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {!loading && filteredRecords.length === 0 ? (
                <div className="payroll-empty">
                  <CheckCircle2 size={20} />
                  <div className="payroll-empty__content">
                    <strong>
                      {monthRecords.length === 0
                        ? `Chưa có bảng lương tạm tính cho kỳ ${formatMonthLabel(selectedMonth)}`
                        : "Không có nhân viên phù hợp với bộ lọc hiện tại"}
                    </strong>
                      <span>
                        {monthRecords.length === 0
                        ? "Chưa có production part work log phù hợp trong kỳ này."
                        : "Thử xoá bớt từ khoá tìm kiếm hoặc trạng thái để xem lại toàn bộ danh sách."}
                      </span>
                  </div>

                  {hasFilters ? (
                    <div className="payroll-empty__actions">
                      <button
                        type="button"
                        className="payroll-empty__button"
                        onClick={clearFilters}
                      >
                        Xoá bộ lọc
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="payroll-table-wrap">
                    <table className="payroll-table">
                      <thead>
                        <tr>
                          <th className="payroll-table__cell payroll-table__cell--person">
                            Worker
                          </th>
                          <th className="payroll-table__cell payroll-table__cell--count">
                            Số mục
                          </th>
                          <th className="payroll-table__cell payroll-table__cell--money">
                            Tiền công
                          </th>
                          <th className="payroll-table__cell payroll-table__cell--money">
                            Tổng tạm tính
                          </th>
                          <th className="payroll-table__cell payroll-table__cell--status">
                            Trạng thái
                          </th>
                          <th className="payroll-table__cell payroll-table__cell--actions">
                            Thao tác
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRecords.map((record) => {
                          const statusMeta = STATUS_META[record.status] ?? STATUS_META.pending;
                          const recordKey = `${record.employeeId}-${record.month}`;
                          const isSubmitting = submittingKey === recordKey;

                          return (
                            <tr key={`${record.employeeId}-${record.month}`}>
                              <td className="payroll-table__body payroll-table__cell--person">
                                <div className="payroll-person">
                                  <div className={`payroll-avatar payroll-avatar--${record.avatarTone}`}>
                                    {getPayrollInitials(record.fullName)}
                                  </div>
                                  <div>
                                    <div className="payroll-person__name">{record.fullName}</div>
                                    <div className="payroll-person__meta">
                                      {record.employeeCode} · {record.team}
                                    </div>
                                    <div className="payroll-person__meta">
                                      PM phụ trách: {record.workflow.pmName}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="payroll-table__body payroll-table__cell--count">
                                <div className="payroll-data-block">
                                  <strong className="payroll-data-block__value">
                                    {record.workItems.length} mục
                                  </strong>
                                  <span className="payroll-data-block__meta">
                                    Sản lượng do worker xác nhận
                                  </span>
                                </div>
                              </td>
                              <td className="payroll-table__body payroll-table__cell--money">
                                <div className="payroll-data-block">
                                  <strong className="payroll-data-block__value">
                                    {formatCurrency(record.grossIncome)}
                                  </strong>
                                  <span className="payroll-data-block__meta">
                                    `quantity x cpu`
                                  </span>
                                </div>
                              </td>
                              <td className="payroll-table__body payroll-table__cell--money payroll-table__body--strong">
                                <div className="payroll-data-block payroll-data-block--strong">
                                  <strong className="payroll-data-block__value">
                                    {formatCurrency(record.netIncome)}
                                  </strong>
                                  <span className="payroll-data-block__meta">
                                    Bằng tiền công công đoạn kỳ này
                                  </span>
                                </div>
                              </td>
                              <td className="payroll-table__body payroll-table__cell--status">
                                <span className={statusMeta.className}>{statusMeta.label}</span>
                              </td>
                              <td className="payroll-table__body payroll-table__cell--actions">
                                <div className="payroll-table__actions">
                                  <Link
                                    to={`/salary/${record.employeeId}?month=${selectedMonth}`}
                                    className="payroll-action-btn"
                                    aria-label={`Xem chi tiết bảng lương của ${record.fullName}`}
                                  >
                                    <Eye size={16} />
                                  </Link>
                                  <button
                                    type="button"
                                    className="payroll-action-btn payroll-action-btn--secondary"
                                    onClick={() => handleExportRow(record)}
                                    aria-label={`Xuất phiếu lương của ${record.fullName}`}
                                  >
                                    <Download size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    className="payroll-action-btn payroll-action-btn--secondary payroll-action-btn--text"
                                    onClick={() => handleMarkAsPaid(record)}
                                    disabled={record.status === "paid" || isSubmitting}
                                    aria-label={`Thanh toán cho ${record.fullName}`}
                                  >
                                    <span>
                                      {record.status === "paid"
                                        ? "Đã thanh toán"
                                        : isSubmitting
                                          ? "Đang lưu..."
                                          : "Thanh toán"}
                                    </span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="payroll-mobile-list">
                    {paginatedRecords.map((record) => {
                      const statusMeta = STATUS_META[record.status] ?? STATUS_META.pending;
                      const recordKey = `${record.employeeId}-${record.month}`;
                      const isSubmitting = submittingKey === recordKey;

                      return (
                        <article
                          key={`mobile-${record.employeeId}-${record.month}`}
                          className="payroll-mobile-card"
                        >
                          <div className="payroll-mobile-card__header">
                            <div className="payroll-person">
                              <div className={`payroll-avatar payroll-avatar--${record.avatarTone}`}>
                                {getPayrollInitials(record.fullName)}
                              </div>
                              <div>
                                <div className="payroll-person__name">{record.fullName}</div>
                                <div className="payroll-person__meta">
                                  {record.employeeCode} · {record.team}
                                </div>
                                <div className="payroll-person__meta">
                                  PM phụ trách: {record.workflow.pmName}
                                </div>
                              </div>
                            </div>
                            <span className={statusMeta.className}>{statusMeta.label}</span>
                          </div>

                          <div className="payroll-mobile-card__grid">
                            <div className="payroll-mobile-card__metric">
                              <span>Số công đoạn</span>
                              <strong>{record.workItems.length} mục</strong>
                            </div>
                            <div className="payroll-mobile-card__metric">
                              <span>Tiền công</span>
                              <strong>{formatCurrency(record.grossIncome)}</strong>
                            </div>
                            <div className="payroll-mobile-card__metric payroll-mobile-card__metric--highlight">
                              <span>Tổng tạm tính</span>
                              <strong>{formatCurrency(record.netIncome)}</strong>
                            </div>
                          </div>

                          <div className="payroll-mobile-card__actions">
                            <Link
                              to={`/salary/${record.employeeId}?month=${selectedMonth}`}
                              className="payroll-action-btn payroll-action-btn--text"
                            >
                              <Eye size={16} />
                              <span>Chi tiết</span>
                            </Link>
                            <button
                              type="button"
                              className="payroll-action-btn payroll-action-btn--secondary payroll-action-btn--text"
                              onClick={() => handleExportRow(record)}
                            >
                              <Download size={16} />
                              <span>Xuất phiếu</span>
                            </button>
                            <button
                              type="button"
                              className="payroll-action-btn payroll-action-btn--secondary payroll-action-btn--text"
                              onClick={() => handleMarkAsPaid(record)}
                              disabled={record.status === "paid" || isSubmitting}
                            >
                              <span>
                                {record.status === "paid"
                                  ? "Đã thanh toán"
                                  : isSubmitting
                                    ? "Đang lưu..."
                                    : "Thanh toán"}
                              </span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {filteredRecords.length ? (
              <div className="payroll-table-card__footer">
                <p className="payroll-table-card__summary">
                  Hiển thị {rangeStart}-{rangeEnd} trong tổng số {filteredRecords.length}{" "}
                  bảng tạm tính của kỳ {formatMonthLabel(selectedMonth)}
                </p>

                <div className="payroll-pagination">
                  <button
                    type="button"
                    className="payroll-pagination__btn"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={safeCurrentPage === 1}
                  >
                    Trước
                  </button>

                  {pageNumbers.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      className={`payroll-pagination__btn ${
                        pageNumber === safeCurrentPage ? "is-active" : ""
                      }`}
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="payroll-pagination__btn"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={safeCurrentPage === totalPages}
                  >
                    Sau
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
