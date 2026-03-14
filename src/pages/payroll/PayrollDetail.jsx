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
  Wallet,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  formatCurrency,
  formatDateLabel,
  formatMonthLabel,
  getLatestPayrollMonth,
  getLatestPayrollRecordForEmployee,
  getPayrollInitials,
  getPayrollRecord,
} from "@/lib/payroll";
import "@/styles/payroll.css";

const STATUS_META = {
  paid: {
    label: "Đã thanh toán",
    className: "payroll-status payroll-status--paid",
    description: "Khoản lương này đã được owner xác nhận chi trả.",
  },
  pending: {
    label: "Chờ xử lý",
    className: "payroll-status payroll-status--pending",
    description: "Cần owner rà soát và xác nhận trước khi thanh toán.",
  },
};

export default function PayrollDetail() {
  const { employeeId } = useParams();
  const [searchParams] = useSearchParams();
  const requestedMonth = searchParams.get("month") || getLatestPayrollMonth();
  const exactRecord = useMemo(
    () => getPayrollRecord(employeeId, requestedMonth),
    [employeeId, requestedMonth]
  );
  const latestRecord = useMemo(
    () => getLatestPayrollRecordForEmployee(employeeId),
    [employeeId]
  );
  const record = exactRecord || latestRecord;
  const activeMonth = record?.month || requestedMonth;
  const [paymentState, setPaymentState] = useState({
    status: record?.status ?? "pending",
    paidAt: record?.paidAt ?? null,
  });
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setPaymentState({
      status: record?.status ?? "pending",
      paidAt: record?.paidAt ?? null,
    });
    setFeedback("");
  }, [record]);

  const currentStatus = paymentState.status;
  const paidAt = paymentState.paidAt;
  const statusMeta = STATUS_META[currentStatus] ?? STATUS_META.pending;
  const isFallbackMonth = Boolean(record && !exactRecord && requestedMonth !== activeMonth);

  const handleConfirmPayment = () => {
    const confirmedAt = new Date().toISOString();

    setPaymentState({
      status: "paid",
      paidAt: confirmedAt,
    });
    setFeedback("Đã cập nhật trạng thái thanh toán trên giao diện demo.");
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
                Theo dõi thực lĩnh, phụ cấp và từng công đoạn đã hoàn thành của nhân viên.
              </p>
            </div>
          </div>

          {!record ? (
            <div className="payroll-state payroll-state--error">
              <CircleAlert size={20} />
              <div className="payroll-empty__content">
                <strong>Không tìm thấy bảng lương phù hợp</strong>
                <span>
                  Kiểm tra lại nhân viên hoặc kỳ lương đang chọn rồi thử lại.
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
                      Chi tiết bảng lương: {record.fullName}
                    </h2>
                    <p className="payroll-detail-panel__subtitle">
                      Bảng kê sản lượng chi tiết kỳ lương {formatMonthLabel(activeMonth)} ·{" "}
                      {record.employeeCode}
                    </p>
                  </div>
                </div>

                <div className="payroll-detail-panel__grid">
                  <article className="payroll-highlight-card payroll-highlight-card--primary">
                    <div className="payroll-highlight-card__label">
                      <BadgeDollarSign size={17} />
                      <span>Tổng lương tháng này</span>
                    </div>
                    <div className="payroll-highlight-card__value">
                      {formatCurrency(record.netIncome)}
                    </div>
                    <p className="payroll-highlight-card__meta">
                      Gồm {formatCurrency(record.grossIncome)} tiền công và{" "}
                      {formatCurrency(record.allowance)} phụ cấp.
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
                </div>

                <div className="payroll-detail-panel__grid payroll-detail-panel__grid--secondary">
                  <article className="payroll-field-card">
                    <div className="payroll-field-card__label">
                      <Wallet size={17} />
                      <span>Phụ cấp</span>
                    </div>
                    <div className="payroll-field-card__value">
                      {formatCurrency(record.allowance)}
                    </div>
                    <p className="payroll-field-card__text">
                      Bao gồm thưởng năng suất, chuyên cần và hỗ trợ tăng ca nếu có.
                    </p>
                  </article>

                  <article className="payroll-field-card">
                    <div className="payroll-field-card__label">
                      <FileText size={17} />
                      <span>Ghi chú</span>
                    </div>
                    <div className="payroll-field-card__note">{record.note}</div>
                  </article>
                </div>

                <article className="payroll-detail-list-card">
                  <div className="payroll-detail-list-card__header">
                    <div>
                      <h3 className="payroll-detail-list-card__title">
                        Danh sách công đoạn đã làm
                      </h3>
                      <p className="payroll-detail-list-card__subtitle">
                        Chi tiết sản lượng đã được chốt cho kỳ lương này.
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
                          <span className="payroll-task-card__pill">Đã chốt công</span>
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
                    <div className="payroll-detail-feedback">
                      {feedback ? (
                        <p className="payroll-inline-note payroll-inline-note--success">
                          {feedback}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="payroll-detail-cta"
                      onClick={handleConfirmPayment}
                      disabled={currentStatus === "paid"}
                    >
                      {currentStatus === "paid"
                        ? "Đã xác nhận thanh toán"
                        : "Xác nhận trả lương"}
                    </button>
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
