import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, FileText, Loader2, MessageSquareQuote, UserRound, XCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { formatLeaveDateTime } from "@/lib/leaveDateTime";
import LeaveService from "@/services/LeaveService";
import "@/styles/leave.css";

const STATUS_MAP = {
  pending: {
    label: "Chờ duyệt",
    icon: Clock3,
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    panel: "border-amber-200 bg-amber-50 text-amber-800",
  },
  approved: {
    label: "Đã duyệt",
    icon: CheckCircle2,
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    panel: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  rejected: {
    label: "Từ chối",
    icon: XCircle,
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    panel: "border-rose-200 bg-rose-50 text-rose-800",
  },
  cancel_requested: {
    label: "Chờ hủy",
    icon: Clock3,
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    panel: "border-orange-200 bg-orange-50 text-orange-800",
  },
  cancelled: {
    label: "Đã hủy",
    icon: XCircle,
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    panel: "border-slate-200 bg-slate-50 text-slate-800",
  },
};

function StatusBadge({ status }) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${config.badge}`}>
      <Icon size={14} />
      {config.label}
    </span>
  );
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon size={14} />
        {label}
      </div>
      <div className="text-sm font-medium leading-6 text-slate-800">{value || "Chưa cập nhật"}</div>
    </div>
  );
}

function shouldShowApprover(leave) {
  return Boolean(leave?.approvedByName) && leave?.status !== "pending";
}

function getTimelineItems(leave) {
  const isApproved = leave?.status === "approved";
  const isRejected = leave?.status === "rejected";
  const isPending = leave?.status === "pending";
  const isCancelRequested = leave?.status === "cancel_requested";
  const isCancelled = leave?.status === "cancelled";

  return [
    {
      title: "Tạo đơn",
      value: formatLeaveDateTime(leave?.dateCreate),
      tone: "done",
    },
    {
      title: isPending ? "Đang chờ xử lý" : isCancelRequested ? "Đang chờ duyệt hủy" : "Đã phản hồi",
      value: isPending
        ? "Đơn hiện vẫn đang ở trạng thái chờ duyệt."
        : isCancelRequested
          ? leave?.cancelContent || "Yêu cầu hủy đang chờ được phản hồi."
          : formatLeaveDateTime(leave?.dateReply),
      tone: isPending || isCancelRequested ? "current" : "done",
    },
    {
      title: isApproved ? "Kết quả duyệt" : isRejected ? "Kết quả từ chối" : isCancelled ? "Kết quả hủy đơn" : "Kết quả cuối cùng",
      value: isApproved
        ? "Đơn nghỉ đã được phê duyệt."
        : isRejected
          ? leave?.denyContent || "Đơn nghỉ đã bị từ chối."
          : isCancelled
            ? leave?.cancelContent || "Đơn nghỉ đã được hủy."
          : "Chưa có kết quả xử lý cuối cùng.",
      tone: isApproved ? "done" : isRejected ? "rejected" : "upcoming",
    },
  ];
}

export default function LeaveRequestHistoryDetail() {
  const { id } = useParams();
  const [leave, setLeave] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await LeaveService.getLeaveRequestById(id);

        if (!mounted) return;

        if (!data) {
          setLeave(null);
          setError("Không tìm thấy bản ghi lịch sử đơn nghỉ.");
          return;
        }

        setLeave(data);
        setError("");
      } catch {
        if (!mounted) return;
        setLeave(null);
        setError("Không thể tải chi tiết lịch sử đơn nghỉ.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchDetail();

    return () => {
      mounted = false;
    };
  }, [id]);

  const statusConfig = useMemo(() => STATUS_MAP[leave?.status] ?? STATUS_MAP.pending, [leave?.status]);
  const timelineItems = useMemo(() => getTimelineItems(leave), [leave]);

  return (
    <DashboardLayout>
      <div className="leave-page leave-detail-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex min-h-[24rem] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <Loader2 size={32} className="animate-spin text-emerald-600" />
                <span className="text-sm">Đang tải chi tiết lịch sử đơn nghỉ...</span>
              </div>
            </div>
          ) : error || !leave ? (
            <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center text-sm text-rose-600 shadow-sm">
              {error || "Không tìm thấy dữ liệu."}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 p-6 text-white shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Link
                      to="/leave-history"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                    >
                      <ArrowLeft size={16} />
                      Quay lại
                    </Link>
                    <div className="hidden h-8 w-px bg-white/20 sm:block" />
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-emerald-100/80">Leave Request History</div>
                      <h1 className="mt-1 text-2xl font-bold">Chi tiết lịch sử đơn nghỉ</h1>
                    </div>
                  </div>

                  <StatusBadge status={leave.status} />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <div className="text-xs uppercase tracking-wide text-emerald-100/80">Mã đơn</div>
                    <div className="mt-2 text-lg font-semibold">LR-{String(leave.id).padStart(3, "0")}</div>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <div className="text-xs uppercase tracking-wide text-emerald-100/80">Ngày gửi</div>
                    <div className="mt-2 text-lg font-semibold">{formatLeaveDateTime(leave.dateCreate)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <div className="text-xs uppercase tracking-wide text-emerald-100/80">Ngày phản hồi</div>
                    <div className="mt-2 text-lg font-semibold">{formatLeaveDateTime(leave.dateReply)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <div className="text-xs uppercase tracking-wide text-emerald-100/80">Người phê duyệt</div>
                    <div className="mt-2 text-lg font-semibold">{shouldShowApprover(leave) ? leave.approvedByName : "Chưa cập nhật"}</div>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4 md:col-span-3">
                    <div className="text-xs uppercase tracking-wide text-emerald-100/80">Khung giờ nghỉ</div>
                    <div className="mt-2 text-lg font-semibold">
                      {formatLeaveDateTime(leave.fromDate)} - {formatLeaveDateTime(leave.toDate)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
                <div className="space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">Thông tin đơn nghỉ</h2>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <DetailItem icon={UserRound} label="Nhân viên gửi đơn" value={leave.userFullName} />
                      <DetailItem icon={CalendarClock} label="Ngày tạo đơn" value={formatLeaveDateTime(leave.dateCreate)} />
                      <DetailItem icon={UserRound} label="Người phê duyệt" value={shouldShowApprover(leave) ? leave.approvedByName : ""} />
                      <DetailItem icon={CalendarClock} label="Bắt đầu nghỉ" value={formatLeaveDateTime(leave.fromDate)} />
                      <DetailItem icon={CalendarClock} label="Kết thúc nghỉ" value={formatLeaveDateTime(leave.toDate)} />
                    </div>

                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-900">
                      {leave.content || "Chưa có nội dung đơn nghỉ."}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">Phản hồi xử lý</h2>

                    <div className={`mt-5 rounded-2xl border px-5 py-4 text-sm leading-7 ${statusConfig.panel}`}>
                      <div className="font-semibold">Trạng thái hiện tại: {statusConfig.label}</div>
                      <div className="mt-2">
                        {leave.status === "rejected"
                          ? leave.denyContent || "Đơn bị từ chối nhưng chưa có nội dung phản hồi chi tiết."
                          : leave.status === "cancel_requested"
                            ? leave.cancelContent || "Đã có yêu cầu hủy và đang chờ phản hồi."
                            : leave.status === "cancelled"
                              ? leave.cancelContent || "Đơn nghỉ đã được hủy."
                          : leave.status === "approved"
                            ? "Đơn nghỉ đã được chấp nhận."
                            : "Đơn nghỉ hiện đang chờ phản hồi từ người phụ trách."}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <DetailItem icon={CalendarClock} label="Ngày phản hồi" value={formatLeaveDateTime(leave.dateReply)} />
                      <DetailItem icon={FileText} label="Mã người gửi" value={leave.userId ? `USER-${leave.userId}` : ""} />
                    </div>

                    {leave.denyContent ? (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-800">
                        <div className="mb-2 flex items-center gap-2 font-semibold">
                          <MessageSquareQuote size={16} />
                          Lý do từ chối
                        </div>
                        {leave.denyContent}
                      </div>
                    ) : null}

                    {leave.rejectCancelContent ? (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-800">
                        <div className="mb-2 flex items-center gap-2 font-semibold">
                          <MessageSquareQuote size={16} />
                          Lý do từ chối yêu cầu hủy
                        </div>
                        {leave.rejectCancelContent}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">Timeline xử lý</h2>
                  <div className="mt-5 space-y-4">
                    {timelineItems.map((item, index) => (
                      <div key={item.title} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`mt-1 h-3 w-3 rounded-full ${
                              item.tone === "done"
                                ? "bg-emerald-500"
                                : item.tone === "current"
                                  ? "bg-amber-500"
                                  : item.tone === "rejected"
                                    ? "bg-rose-500"
                                    : "bg-slate-300"
                            }`}
                          />
                          {index < timelineItems.length - 1 ? <div className="mt-2 h-full w-px bg-slate-200" /> : null}
                        </div>
                        <div className="pb-4">
                          <div className="text-sm font-semibold text-slate-800">{item.title}</div>
                          <div className="mt-1 text-sm leading-6 text-slate-500">{item.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
