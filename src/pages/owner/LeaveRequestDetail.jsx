import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  MessageSquareQuote,
  UserRound,
  XCircle,
} from "lucide-react";
import PmOwnerLayout from "@/layouts/PmOwnerLayout";
import WorkerLayout from "@/layouts/WorkerLayout";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";
import { formatLeaveDateTime } from "@/lib/leaveDateTime";
import LeaveService, { getLeaveErrorMessage } from "@/services/LeaveService";
import "@/styles/leave.css";

const STATUS_MAP = {
  pending: {
    label: "Chờ duyệt",
    icon: Clock3,
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  approved: {
    label: "Đã duyệt",
    icon: CheckCircle2,
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  rejected: {
    label: "Từ chối",
    icon: XCircle,
    badge: "bg-rose-50 text-rose-700 border-rose-200",
  },
  cancel_requested: {
    label: "Chờ hủy",
    icon: Clock3,
    badge: "bg-orange-50 text-orange-700 border-orange-200",
  },
  cancelled: {
    label: "Đã hủy",
    icon: XCircle,
    badge: "bg-slate-100 text-slate-700 border-slate-200",
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

export default function LeaveRequestDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const user = getStoredUser();
  const isWorkerRoute = location.pathname.startsWith("/worker/leave-requests");
  const primaryRole = getPrimaryWorkspaceRole(user?.role);
  const backPath = isWorkerRoute ? "/worker/leave-requests" : "/leave-requests";
  const LayoutComponent = primaryRole === "worker" || primaryRole === "kcs" ? WorkerLayout : PmOwnerLayout;
  const [leave, setLeave] = useState(location.state?.leave ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchLeaveDetail = async () => {
      try {
        setLoading(true);
        const data = await LeaveService.getMyLeaveRequestById(id);

        if (!active) return;

        if (!data) {
          setLeave(null);
          setError("Không tìm thấy đơn nghỉ của bạn.");
          return;
        }

        setLeave(data);
        setError("");
      } catch (err) {
        if (!active) return;
        setError(getLeaveErrorMessage(err, "Không thể tải chi tiết đơn nghỉ."));
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchLeaveDetail();

    return () => {
      active = false;
    };
  }, [id]);

  const timelineItems = useMemo(() => {
    const isApproved = leave?.status === "approved";
    const isRejected = leave?.status === "rejected";
    const isCancelRequested = leave?.status === "cancel_requested";
    const isCancelled = leave?.status === "cancelled";

    return [
      {
        title: "Đơn đã được gửi",
        value: formatLeaveDateTime(leave?.dateCreate),
      },
      {
        title: leave?.status === "pending" ? "Đang chờ xét duyệt" : isCancelRequested ? "Đang chờ duyệt hủy" : "Đã có phản hồi",
        value: leave?.status === "pending"
          ? "Đơn đang chờ xử lý."
          : isCancelRequested
            ? leave?.cancelContent || "Yêu cầu hủy đang chờ được xác nhận."
            : formatLeaveDateTime(leave?.dateReply),
      },
      {
        title: isApproved ? "Đã duyệt" : isRejected ? "Bị từ chối" : isCancelled ? "Đã hủy đơn" : "Kết quả xử lý",
        value: isApproved
          ? "Đơn nghỉ đã được phê duyệt."
          : isRejected
            ? leave?.denyContent || "Đơn nghỉ đã bị từ chối."
            : isCancelled
              ? leave?.cancelContent || "Đơn nghỉ đã được hủy."
            : "Chưa có phản hồi cuối cùng.",
      },
    ];
  }, [leave]);

  const canCancelPending = leave?.status === "pending";
  const canRequestCancel = leave?.status === "approved";

  const handleCancelAction = async () => {
    if (!(canCancelPending || canRequestCancel) || !cancelReason.trim()) return;

    try {
      setSubmitting(true);

      if (canCancelPending) {
        await LeaveService.cancelLeaveRequest(id, {
          cancelContent: cancelReason.trim(),
        });
      } else {
        await LeaveService.requestCancelLeaveRequest(id, {
          cancelContent: cancelReason.trim(),
        });
      }

      const refreshed = await LeaveService.getMyLeaveRequestById(id);
      setLeave(
        refreshed ?? {
          ...leave,
          status: canCancelPending ? "cancelled" : "cancel_requested",
          cancelContent: cancelReason.trim(),
          dateReply: canCancelPending ? new Date().toISOString() : leave?.dateReply,
        }
      );
      setCancelOpen(false);
      setCancelReason("");
      setError("");
    } catch (err) {
      setError(
        getLeaveErrorMessage(
          err,
          canCancelPending
            ? "Không thể hủy đơn nghỉ. Vui lòng thử lại."
            : "Không thể gửi yêu cầu hủy đơn nghỉ. Vui lòng thử lại."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LayoutComponent>
      <div className="leave-page leave-detail-page">
        <div className="leave-shell mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex min-h-[24rem] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <Loader2 size={32} className="animate-spin text-emerald-600" />
                <span className="text-sm">Đang tải chi tiết đơn nghỉ...</span>
              </div>
            </div>
          ) : error || !leave ? (
            <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center text-sm text-rose-600 shadow-sm">
              {error || "Không tìm thấy dữ liệu đơn nghỉ."}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3.5 rounded-[2rem] bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 p-5 text-white shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(backPath)}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                    >
                      <ArrowLeft size={16} />
                      Quay lại
                    </button>
                    <div className="hidden h-8 w-px bg-white/20 sm:block" />
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-emerald-100/80">
                        Đơn nghỉ của tôi
                      </div>
                      <h1 className="mt-1 text-[1.75rem] font-bold leading-tight">Chi tiết đơn nghỉ</h1>
                    </div>
                  </div>

                  <StatusBadge status={leave.status} />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-emerald-100/80">Người gửi</div>
                    <div className="mt-1.5 text-base font-semibold leading-snug">{leave.userFullName}</div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-emerald-100/80">Ngày tạo đơn</div>
                    <div className="mt-1.5 text-base font-semibold leading-snug">{formatLeaveDateTime(leave.dateCreate)}</div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-emerald-100/80">Ngày phản hồi</div>
                    <div className="mt-1.5 text-base font-semibold leading-snug">{formatLeaveDateTime(leave.dateReply)}</div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-emerald-100/80">Người phê duyệt</div>
                    <div className="mt-1.5 text-base font-semibold leading-snug">{shouldShowApprover(leave) ? leave.approvedByName : "Chưa cập nhật"}</div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 md:col-span-3">
                    <div className="text-[11px] uppercase tracking-wide text-emerald-100/80">Khung giờ nghỉ</div>
                    <div className="mt-1.5 text-base font-semibold leading-snug">
                      {formatLeaveDateTime(leave.fromDate)} - {formatLeaveDateTime(leave.toDate)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">Nội dung xin nghỉ</h2>
                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-900">
                      {leave.content}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">Phản hồi xử lý</h2>
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-700">
                      {leave.status === "rejected"
                        ? leave.denyContent || "Đơn đã bị từ chối nhưng chưa có nội dung phản hồi."
                        : leave.status === "cancel_requested"
                          ? leave.cancelContent || "Bạn đã gửi yêu cầu hủy và đang chờ phản hồi."
                          : leave.status === "cancelled"
                            ? leave.cancelContent || "Đơn nghỉ của bạn đã được hủy."
                        : leave.status === "approved"
                          ? "Đơn nghỉ của bạn đã được phê duyệt."
                          : "Đơn nghỉ đang chờ người có thẩm quyền xem xét."}
                    </div>

                    {(canCancelPending || canRequestCancel) ? (
                      <div className="mt-5">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => setCancelOpen((prev) => !prev)}
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                          >
                            <XCircle size={16} />
                            {canCancelPending ? "Hủy đơn nghỉ" : "Gửi yêu cầu hủy"}
                          </button>
                        </div>

                        {cancelOpen ? (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              {canCancelPending ? "Lý do hủy đơn" : "Lý do yêu cầu hủy"}
                            </label>
                            <textarea
                              rows={4}
                              value={cancelReason}
                              onChange={(event) => setCancelReason(event.target.value)}
                              placeholder={
                                canCancelPending
                                  ? "Nhập lý do hủy đơn nghỉ (bắt buộc)"
                                  : "Nhập lý do yêu cầu hủy đơn nghỉ (bắt buộc)"
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10"
                            />
                            <div className="mt-3 flex justify-end">
                              <button
                                type="button"
                                disabled={submitting || !cancelReason.trim()}
                                onClick={handleCancelAction}
                                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {submitting
                                  ? "Đang xử lý..."
                                  : canCancelPending
                                    ? "Xác nhận hủy đơn"
                                    : "Xác nhận gửi yêu cầu hủy"}
                              </button>
                            </div>
                          </div>
                        ) : null}
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

                <div className="space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">Thông tin đơn</h2>
                    <div className="mt-5 grid gap-3">
                      <DetailItem icon={UserRound} label="Người gửi" value={leave.userFullName} />
                      <DetailItem icon={FileText} label="Trạng thái" value={STATUS_MAP[leave.status]?.label || "Chưa cập nhật"} />
                      <DetailItem icon={CalendarClock} label="Ngày tạo" value={formatLeaveDateTime(leave.dateCreate)} />
                      <DetailItem icon={CalendarClock} label="Ngày phản hồi" value={formatLeaveDateTime(leave.dateReply)} />
                      <DetailItem icon={UserRound} label="Người phê duyệt" value={shouldShowApprover(leave) ? leave.approvedByName : ""} />
                      <DetailItem icon={CalendarClock} label="Bắt đầu nghỉ" value={formatLeaveDateTime(leave.fromDate)} />
                      <DetailItem icon={CalendarClock} label="Kết thúc nghỉ" value={formatLeaveDateTime(leave.toDate)} />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">Timeline xử lý</h2>
                    <div className="mt-5 space-y-4">
                      {timelineItems.map((item, index) => (
                        <div key={item.title} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="mt-1 h-3 w-3 rounded-full bg-emerald-500" />
                            {index < timelineItems.length - 1 && <div className="mt-2 h-full w-px bg-slate-200" />}
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
              </div>
            </>
          )}
        </div>
      </div>
    </LayoutComponent>
  );
}
