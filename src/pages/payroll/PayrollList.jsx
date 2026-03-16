import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  CalendarRange,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Search,
  Users,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  PAYROLL_PAGE_SIZE,
  downloadPayrollCsv,
  formatCurrency,
  formatMonthLabel,
  getLatestPayrollMonth,
  getPayrollInitials,
  getPayrollMonths,
  getPayrollRecordsByMonth,
  getPayrollSummary,
  normalizeSearchText,
} from "@/lib/payroll";
import "@/styles/payroll.css";

const STATUS_META = {
  paid: {
    label: "Đã thanh toán",
    className: "payroll-status payroll-status--paid",
  },
  pending: {
    label: "Chờ xử lý",
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
  const monthOptions = useMemo(() => getPayrollMonths(), []);
  const monthFromQuery = searchParams.get("month");
  const [selectedMonth, setSelectedMonth] = useState(
    monthFromQuery && monthFromQuery.length === 7
      ? monthFromQuery
      : getLatestPayrollMonth()
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedMonth, statusFilter]);

  const monthRecords = useMemo(() => (
    getPayrollRecordsByMonth(selectedMonth)
      .slice()
      .sort((recordA, recordB) => recordB.netIncome - recordA.netIncome)
  ), [selectedMonth]);

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

  const summary = useMemo(() => getPayrollSummary(selectedMonth), [selectedMonth]);
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
                <h1 className="payroll-hero__title">Bảng lương</h1>
                <p className="payroll-hero__subtitle">
                  Theo dõi chi trả, rà soát trạng thái xử lý và xuất báo cáo lương
                  theo từng kỳ làm việc của nhân viên.
                </p>

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
              </div>

              <div className="payroll-hero__aside">
                <label className="payroll-month-picker">
                  <CalendarRange size={18} />
                  <input
                    type="month"
                    value={selectedMonth}
                    min={monthOptions[monthOptions.length - 1]}
                    max={monthOptions[0]}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    aria-label="Chọn kỳ lương"
                  />
                </label>

                <div className="payroll-hero__period-card">
                  <span className="payroll-hero__period-label">Tổng quan kỳ lương</span>
                  <strong className="payroll-hero__period-value">
                    {formatMonthLabel(selectedMonth)}
                  </strong>
                  <p className="payroll-hero__period-meta">
                    {summary.payrollCreated} bảng lương đã tạo, {summary.paidCount}{" "}
                    bảng đã thanh toán và {summary.pendingCount} bảng đang chờ xử lý.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={BadgeDollarSign}
              label="Tổng lương tháng này"
              value={formatCurrency(summary.totalPayroll)}
              meta={comparisonText}
              tone="primary"
            />
            <SummaryCard
              icon={FileText}
              label="Bảng lương đã tạo"
              value={summary.payrollCreated}
              meta={`${summary.paidCount} bảng lương đã thanh toán`}
              tone="info"
            />
            <SummaryCard
              icon={AlertTriangle}
              label="Chờ xử lý"
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

          <div className="payroll-summary-note">
            <strong>Kỳ lương tổng quan</strong>
            <span>
              Số liệu phía trên luôn bám theo tháng đang chọn và không thay đổi theo
              bộ lọc tìm kiếm hoặc trạng thái hiển thị.
            </span>
          </div>

          <section className="payroll-card">
            <div className="payroll-table-card__header">
              <div className="payroll-table-card__intro">
                <span className="payroll-table-card__eyebrow">Danh sách chi trả</span>
                <h2 className="payroll-table-card__title">Danh sách bảng lương</h2>
                <p className="payroll-table-card__subtitle">
                  Theo dõi thu nhập, phụ cấp và trạng thái chi trả theo từng nhân viên.
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
              {filteredRecords.length === 0 ? (
                <div className="payroll-empty">
                  <CheckCircle2 size={20} />
                  <div className="payroll-empty__content">
                    <strong>
                      {monthRecords.length === 0
                        ? `Chưa có bảng lương cho kỳ ${formatMonthLabel(selectedMonth)}`
                        : "Không có nhân viên phù hợp với bộ lọc hiện tại"}
                    </strong>
                    <span>
                      {monthRecords.length === 0
                        ? "Hãy chọn kỳ lương khác hoặc kết nối dữ liệu bảng lương từ hệ thống."
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
                            Nhân viên
                          </th>
                          <th className="payroll-table__cell payroll-table__cell--count">
                            Số công đoạn
                          </th>
                          <th className="payroll-table__cell payroll-table__cell--money">
                            Tổng thu nhập
                          </th>
                          <th className="payroll-table__cell payroll-table__cell--money">
                            Phụ cấp
                          </th>
                          <th className="payroll-table__cell payroll-table__cell--money">
                            Thực lĩnh
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
                                  </div>
                                </div>
                              </td>
                              <td className="payroll-table__body payroll-table__cell--count">
                                <div className="payroll-data-block">
                                  <strong className="payroll-data-block__value">
                                    {record.workItems.length} mục
                                  </strong>
                                  <span className="payroll-data-block__meta">
                                    Công đoạn đã chốt
                                  </span>
                                </div>
                              </td>
                              <td className="payroll-table__body payroll-table__cell--money">
                                <div className="payroll-data-block">
                                  <strong className="payroll-data-block__value">
                                    {formatCurrency(record.grossIncome)}
                                  </strong>
                                  <span className="payroll-data-block__meta">
                                    Thu nhập công đoạn
                                  </span>
                                </div>
                              </td>
                              <td className="payroll-table__body payroll-table__cell--money">
                                <div className="payroll-data-block">
                                  <strong className="payroll-data-block__value">
                                    {formatCurrency(record.allowance)}
                                  </strong>
                                  <span className="payroll-data-block__meta">
                                    Thưởng và hỗ trợ
                                  </span>
                                </div>
                              </td>
                              <td className="payroll-table__body payroll-table__cell--money payroll-table__body--strong">
                                <div className="payroll-data-block payroll-data-block--strong">
                                  <strong className="payroll-data-block__value">
                                    {formatCurrency(record.netIncome)}
                                  </strong>
                                  <span className="payroll-data-block__meta">
                                    Thực nhận cuối kỳ
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
                              <span>Tổng thu nhập</span>
                              <strong>{formatCurrency(record.grossIncome)}</strong>
                            </div>
                            <div className="payroll-mobile-card__metric">
                              <span>Phụ cấp</span>
                              <strong>{formatCurrency(record.allowance)}</strong>
                            </div>
                            <div className="payroll-mobile-card__metric payroll-mobile-card__metric--highlight">
                              <span>Thực lĩnh</span>
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
                  bảng lương của kỳ {formatMonthLabel(selectedMonth)}
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
