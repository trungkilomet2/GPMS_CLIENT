import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeDollarSign,
  CalendarRange,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  FileText,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  getCurrentMonthValue,
  formatCurrency,
  formatDateLabel,
  formatMonthLabel,
  getPayrollFlowLabel,
  getLatestPayrollRecordForEmployee,
  getPayrollInitials,
  getPayrollRecord,
} from "@/lib/payroll";
import PayrollPreviewService from "@/services/PayrollPreviewService";
import "@/styles/payroll.css";

const STATUS_META = {
  paid: {
    label: "Đã đánh dấu thanh toán",
    className: "payroll-status payroll-status--paid",
    description: "Toàn bộ log hiện có trong kỳ này đã được đánh dấu thanh toán.",
  },
  pending: {
    label: "Tạm tính",
    className: "payroll-status payroll-status--pending",
    description: "Đây là bản tạm tính từ work log, chưa phải payroll backend chính thức.",
  },
};

export default function PayrollDetail() {
  const { employeeId } = useParams();
  const [searchParams] = useSearchParams();
  const requestedMonth = searchParams.get("month") || getCurrentMonthValue();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const exactRecord = useMemo(
    () => getPayrollRecord(records, employeeId, requestedMonth),
    [employeeId, records, requestedMonth]
  );
  const latestRecord = useMemo(
    () => getLatestPayrollRecordForEmployee(records, employeeId),
    [employeeId, records]
  );
  const record = exactRecord || latestRecord;
  const activeMonth = record?.month || requestedMonth;

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
        setError("Không thể tải chi tiết bảng lương tạm tính.");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchPayrollPreview();
    return () => {
      active = false;
    };
  }, []);

  const currentStatus = record?.status ?? "pending";
  const paidAt = record?.paidAt ?? null;
  const statusMeta = STATUS_META[currentStatus] ?? STATUS_META.pending;
  const isFallbackMonth = Boolean(record && !exactRecord && requestedMonth !== activeMonth);

  const handleMarkAsPaid = async () => {
    if (!record || currentStatus === "paid") return;

    try {
      setSubmitting(true);
      setError("");
      const nextRecords = await PayrollPreviewService.markPayrollAsPaid(record.employeeId, activeMonth);
      setRecords(nextRecords);
    } catch (_err) {
      setError("Không thể cập nhật trạng thái thanh toán cho bảng lương này.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="payroll-page payroll-page--detail">
        <div className="payroll-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="payroll-hero payroll-hero--detail">
            <div className="payroll-hero__content">
              <Link
                to={`/salary?month=${activeMonth}`}
                className="payroll-hero__back"
              >
                <ArrowLeft size={20} />
                <span>Quay lại bảng lương</span>
              </Link>
              <h1 className="payroll-hero__title">Chi tiết bảng lương</h1>
              <p className="payroll-hero__subtitle">
                Theo dõi bảng lương tạm tính được suy ra từ sản lượng đầu ra do worker xác nhận.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="payroll-state">
              <CircleAlert size={20} />
              <div className="payroll-empty__content">
                <strong>Đang tải chi tiết bảng lương tạm tính</strong>
                <span>Hệ thống đang tổng hợp work log theo nhân viên.</span>
              </div>
            </div>
          ) : error ? (
            <div className="payroll-state payroll-state--error">
              <CircleAlert size={20} />
              <div className="payroll-empty__content">
                <strong>Không tải được chi tiết bảng lương tạm tính</strong>
                <span>{error}</span>
              </div>
            </div>
          ) : !record ? (
            <div className="payroll-state payroll-state--error">
              <CircleAlert size={20} />
              <div className="payroll-empty__content">
                <strong>Không tìm thấy bảng lương phù hợp</strong>
                <span>
                  Chưa có dữ liệu work log phù hợp để suy ra bảng lương tạm tính cho nhân viên này.
                </span>
              </div>
              <div className="payroll-empty__actions">
                <Link to="/salary" className="payroll-empty__button">
                  Quay về danh sách
                </Link>
              </div>
            </div>
          ) : (
            <>
              {isFallbackMonth ? (
                <div className="payroll-inline-note">
                  Không tìm thấy bảng lương của kỳ {formatMonthLabel(requestedMonth)}.
                  Hệ thống đang hiển thị kỳ gần nhất là {formatMonthLabel(activeMonth)}.
                </div>
              ) : null}

              <section className="payroll-detail-panel">
                <div className="payroll-detail-panel__header">
                  <div className={`payroll-avatar payroll-avatar--${record.avatarTone} payroll-avatar--xl`}>
                    {getPayrollInitials(record.fullName)}
                  </div>

                  <div className="payroll-detail-panel__identity">
                    <div className="payroll-detail-panel__eyebrow">{record.team}</div>
                    <h2 className="payroll-detail-panel__title">
                      Chi tiết bảng lương tạm tính: {record.fullName}
                    </h2>
                    <p className="payroll-detail-panel__subtitle">
                      Bảng kê sản lượng đã xác nhận cho kỳ lương {formatMonthLabel(activeMonth)} ·{" "}
                      {record.employeeCode}
                    </p>
                    <p className="payroll-detail-panel__subtitle">
                      Cơ sở tính lương: sản lượng do worker xác nhận nhân với đơn giá `cpu` của công đoạn
                    </p>
                  </div>
                </div>

                <div className="payroll-detail-panel__grid">
                  <article className="payroll-highlight-card payroll-highlight-card--primary">
                    <div className="payroll-highlight-card__label">
                      <BadgeDollarSign size={17} />
                      <span>Tổng tạm tính tháng này</span>
                    </div>
                    <div className="payroll-highlight-card__value">
                      {formatCurrency(record.netIncome)}
                    </div>
                    <p className="payroll-highlight-card__meta">
                      Toàn bộ tiền công được tính trực tiếp từ sản lượng worker xác nhận nhân với đơn giá `cpu`.
                    </p>
                  </article>

                  <article className="payroll-highlight-card">
                    <div className="payroll-highlight-card__label">
                      <CheckCircle2 size={17} />
                      <span>Trạng thái</span>
                    </div>
                    <div className="payroll-highlight-card__status">
                      <span className={statusMeta.className}>{statusMeta.label}</span>
                    </div>
                    <p className="payroll-highlight-card__meta">
                      {currentStatus === "paid" && paidAt
                        ? `Đã ghi nhận thanh toán ngày ${formatDateLabel(paidAt)}`
                        : statusMeta.description}
                    </p>
                  </article>

                  <article className="payroll-highlight-card">
                    <div className="payroll-highlight-card__label">
                      <ClipboardList size={17} />
                      <span>Chuỗi duyệt</span>
                    </div>
                    <div className="payroll-highlight-card__status">
                      <span className="payroll-status payroll-status--pending">
                        {getPayrollFlowLabel(record)}
                      </span>
                    </div>
                    <p className="payroll-highlight-card__meta">
                      Worker ghi nhận sản lượng, PM theo dõi và owner dùng để đối soát tạm tính.
                    </p>
                  </article>
                </div>

                <div className="payroll-detail-panel__grid payroll-detail-panel__grid--secondary">
                  <article className="payroll-field-card">
                    <div className="payroll-field-card__label">
                      <FileText size={17} />
                      <span>Ghi chú</span>
                    </div>
                    <div className="payroll-field-card__note">{record.note}</div>
                    <p className="payroll-field-card__text">
                      Nguồn tính lương: `get-work-logs/{partId}` kết hợp `cpu` của từng công đoạn.
                    </p>
                  </article>
                </div>

                <article className="payroll-detail-list-card">
                  <div className="payroll-detail-list-card__header">
                    <div>
                      <h3 className="payroll-detail-list-card__title">
                        Danh sách công đoạn đã làm
                      </h3>
                      <p className="payroll-detail-list-card__subtitle">
                        Chi tiết sản lượng do worker xác nhận dùng để tính `quantity x cpu` trong kỳ này.
                      </p>
                    </div>
                    <span className="payroll-detail-list-card__count">
                      {record.workItems.length} mục
                    </span>
                  </div>

                  <div className="payroll-task-list">
                    {record.workItems.map((item) => (
                      <article key={item.id} className="payroll-task-card">
                        <div className="payroll-task-card__top">
                          <div>
                            <h4 className="payroll-task-card__title">{item.name}</h4>
                            <p className="payroll-task-card__plan">
                              Mã kế hoạch: {item.planCode} · {item.productName}
                            </p>
                          </div>
                          <strong className="payroll-task-card__amount">
                            {formatCurrency(item.total)}
                          </strong>
                        </div>

                        <div className="payroll-task-card__footer">
                          <span>
                            {item.quantity.toLocaleString("en-US")} cái x{" "}
                            {formatCurrency(item.unitPrice)}
                          </span>
                          <span className="payroll-task-card__pill">{item.sourceLabel || "Work log"}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </article>

                <div className="payroll-detail-footer">
                  <div className="payroll-detail-timeline">
                    <div className="payroll-detail-timeline__item">
                      <span>
                        <CalendarRange size={16} />
                        <span>Kỳ lương</span>
                      </span>
                      <strong>{formatMonthLabel(activeMonth)}</strong>
                    </div>

                    <div className="payroll-detail-timeline__item">
                      <span>
                        <ClipboardList size={16} />
                        <span>Ngày tạo</span>
                      </span>
                      <strong>{formatDateLabel(record.createdAt)}</strong>
                    </div>

                    <div className="payroll-detail-timeline__item">
                      <span>
                        <CheckCircle2 size={16} />
                        <span>Ngày thanh toán</span>
                      </span>
                      <strong>{formatDateLabel(paidAt)}</strong>
                    </div>
                  </div>

                  <div className="payroll-detail-footer__actions">
                    <button
                      type="button"
                      className="payroll-detail-cta"
                      onClick={handleMarkAsPaid}
                      disabled={submitting || currentStatus === "paid"}
                    >
                      {currentStatus === "paid"
                        ? "Đã thanh toán"
                        : submitting
                          ? "Đang cập nhật..."
                          : "Thanh toán"}
                    </button>
                    <div className="payroll-detail-feedback">
                      <p className="payroll-inline-note">
                        {currentStatus === "paid"
                          ? `Ngày thanh toán được lưu theo thời điểm owner bấm nút thanh toán: ${formatDateLabel(paidAt)}.`
                          : "Khi owner bấm thanh toán, hệ thống sẽ lưu ngày hiện tại làm ngày thanh toán cho bản tạm tính này."}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
