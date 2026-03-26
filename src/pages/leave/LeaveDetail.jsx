import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MapPin,
  Phone,
  UserRound,
  XCircle,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { getStoredUser } from "@/lib/authStorage";
import { formatLeaveDateTime } from "@/lib/leaveDateTime";
import { canManageLeaveRequests } from "@/lib/roleAccess";
import LeaveService, { getLeaveErrorMessage } from "@/services/LeaveService";
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
  cancelled: {
    label: "Đã hủy",
    icon: XCircle,
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    panel: "border-slate-200 bg-slate-50 text-slate-800",
  },
  cancel_requested: {
    label: "Chờ hủy",
    icon: Clock3,
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    panel: "border-orange-200 bg-orange-50 text-orange-800",
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

function DetailItem({ icon, label, value }) {
  const Icon = icon;

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

function getTimelineItems(leave) {
  const isApproved = leave?.status === "approved";
  const isRejected = leave?.status === "rejected";
  const isPending = leave?.status === "pending";

  return [
    {
      title: "Đơn được gửi",
      value: formatLeaveDateTime(leave?.dateCreate),
      tone: "done",
    },
    {
      title: isPending ? "Đang chờ phản hồi" : "Đã phản hồi",
      value: isPending ? "Đơn đang chờ duyệt" : formatLeaveDateTime(leave?.dateReply),
      tone: isPending ? "current" : "done",
    },
    {
      title: isApproved ? "Đã phê duyệt" : isRejected ? "Đã từ chối" : "Kết quả xử lý",
      value: isApproved
        ? "Đơn nghỉ đã được phê duyệt."
        : isRejected
          ? leave?.denyContent || "Đơn nghỉ đã bị từ chối."
          : "Chưa có kết quả cuối cùng.",
      tone: isApproved ? "done" : isRejected ? "rejected" : "upcoming",
    },
  ];
}

export default function LeaveDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const user = getStoredUser();
  const [leave, setLeave] = useState(location.state?.leave ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchLeaveDetail = async () => {
      try {
        setLoading(true);
        const data = await LeaveService.getLeaveRequestById(id);

        if (!active) return;

        if (!data) {
          setError("Không tìm thấy đơn xin nghỉ.");
          setLeave(null);
          return;
        }

        setLeave(data);
        setError("");
      } catch {
        if (!active) return;
        setError("Không thể tải chi tiết đơn nghỉ.");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchLeaveDetail();

    return () => {
      active = false;
    };
  }, [id]);

  const statusConfig = useMemo(
    () => STATUS_MAP[leave?.status] ?? STATUS_MAP.pending,
    [leave?.status]
  );
  const timelineItems = useMemo(() => getTimelineItems(leave), [leave]);
  const hasReviewPermission = canManageLeaveRequests(user?.role);
  const canReview = hasReviewPermission && leave?.status === "pending";
  const canConfirmCancel = hasReviewPermission && leave?.status === "cancel_requested";

  const handleApprove = async () => {
    if (!hasReviewPermission) {
      setError("Bạn không có quyền phê duyệt đơn nghỉ.");
      return;
    }

    try {
      setSubmitting(true);
      await LeaveService.approveLeaveRequest(id);

      const refreshed = await LeaveService.getLeaveRequestById(id);
      setLeave(
        refreshed ?? {
          ...leave,
          status: "approved",
          dateReply: new Date().toISOString(),
          denyContent: "",
        }
      );
    } catch (err) {
      setError(getLeaveErrorMessage(err, "Không thể phê duyệt đơn nghỉ. Vui lòng thử lại."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!hasReviewPermission) {
      setError("Bạn không có quyền từ chối đơn nghỉ.");
      return;
    }

    if (!rejectReason.trim()) return;

    try {
      setSubmitting(true);
      await LeaveService.denyLeaveRequest(id, {
        denyContent: rejectReason.trim(),
      });

      const refreshed = await LeaveService.getLeaveRequestById(id);
      setLeave(
        refreshed ?? {
          ...leave,
          status: "rejected",
          dateReply: new Date().toISOString(),
          denyContent: rejectReason.trim(),
        }
      );
      setRejectOpen(false);
      setRejectReason("");
    } catch (err) {
      setError(getLeaveErrorMessage(err, "Không thể từ chối đơn nghỉ. Vui lòng thử lại."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!canConfirmCancel) return;

    try {
      setSubmitting(true);
      await LeaveService.confirmCancelLeaveRequest(id);

      const refreshed = await LeaveService.getLeaveRequestById(id);
      setLeave(
        refreshed ?? {
          ...leave,
          status: "cancelled",
          dateReply: new Date().toISOString(),
        }
      );
    } catch (err) {
      setError(getLeaveErrorMessage(err, "Không thể xác nhận hủy đơn nghỉ. Vui lòng thử lại."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="leave-page leave-detail-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
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
          <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 p-6 text-white shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                >
                  <ArrowLeft size={16} />
                  Quay lại
                </button>
                <div className="hidden h-8 w-px bg-white/20 sm:block" />
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-emerald-100/80">Leave Request</div>
                  <h1 className="mt-1 text-2xl font-bold">Chi tiết đơn xin nghỉ #{leave.id}</h1>
                </div>
              </div>

              <StatusBadge status={leave.status} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <div className="text-xs uppercase tracking-wide text-emerald-100/80">Người gửi</div>
                <div className="mt-2 text-lg font-semibold">{leave.userFullName}</div>
                <div className="mt-1 text-sm text-emerald-100/90">{statusConfig.label}</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <div className="text-xs uppercase tracking-wide text-emerald-100/80">Ngày tạo đơn</div>
                <div className="mt-2 text-lg font-semibold">{formatLeaveDateTime(leave.dateCreate)}</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <div className="text-xs uppercase tracking-wide text-emerald-100/80">Ngày phản hồi</div>
                <div className="mt-2 text-lg font-semibold">{formatLeaveDateTime(leave.dateReply)}</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <div className="text-xs uppercase tracking-wide text-emerald-100/80">Người phê duyệt</div>
                <div className="mt-2 text-lg font-semibold">{leave.approvedByName || "Chưa cập nhật"}</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 md:col-span-3">
                <div className="text-xs uppercase tracking-wide text-emerald-100/80">Khung giờ nghỉ</div>
                <div className="mt-2 text-lg font-semibold">
                  {formatLeaveDateTime(leave.fromDate)} - {formatLeaveDateTime(leave.toDate)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Nội dung xin nghỉ</h2>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-900">
                  {leave.content}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Thông tin phản hồi</h2>

                <div className={`mt-5 rounded-2xl border px-5 py-4 text-sm leading-7 ${statusConfig.panel}`}>
                  <div className="font-semibold">Trạng thái xử lý: {statusConfig.label}</div>
                  <div className="mt-2">
                    {leave.status === "rejected"
                      ? leave.denyContent || "Đơn đã bị từ chối nhưng chưa có nội dung phản hồi."
                      : leave.status === "cancel_requested"
                        ? leave.cancelContent || "Nhân viên đã gửi yêu cầu hủy đơn nghỉ."
                        : leave.status === "cancelled"
                          ? leave.cancelContent || "Đơn nghỉ đã được hủy."
                      : leave.status === "approved"
                        ? "Đơn đã được phê duyệt và có thể dùng làm căn cứ thông báo cho người gửi."
                        : "Đơn đang chờ người có thẩm quyền xem xét và phản hồi."}
                  </div>
                </div>

                {canReview && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleApprove}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <CheckCircle2 size={16} />
                      {submitting ? "Đang xử lý..." : "Phê duyệt đơn"}
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setRejectOpen((prev) => !prev)}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                    >
                      <XCircle size={16} />
                      Từ chối đơn
                    </button>
                  </div>
                )}

                {canConfirmCancel && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleConfirmCancel}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      <CheckCircle2 size={16} />
                      {submitting ? "Đang xử lý..." : "Xác nhận hủy đơn"}
                    </button>
                  </div>
                )}

                {canReview && rejectOpen && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Lý do từ chối</label>
                    <textarea
                      rows={4}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Nhập lý do từ chối đơn nghỉ (bắt buộc)"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10"
                    />
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        disabled={submitting || !rejectReason.trim()}
                        onClick={handleReject}
                        className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Xác nhận từ chối
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Thông tin người gửi</h2>
                <div className="mt-5 grid gap-3">
                  <DetailItem icon={UserRound} label="Họ và tên" value={leave.userFullName} />
                  <DetailItem icon={UserRound} label="Người phê duyệt" value={leave.approvedByName} />
                  <DetailItem icon={CalendarClock} label="Bắt đầu nghỉ" value={formatLeaveDateTime(leave.fromDate)} />
                  <DetailItem icon={CalendarClock} label="Kết thúc nghỉ" value={formatLeaveDateTime(leave.toDate)} />
                  <DetailItem icon={Phone} label="Số điện thoại" value="" />
                  <DetailItem icon={Mail} label="Email" value="" />
                  <DetailItem icon={MapPin} label="Địa chỉ" value="" />
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
                        {index < timelineItems.length - 1 && (
                          <div className="mt-2 h-full w-px bg-slate-200" />
                        )}
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
    </DashboardLayout>
  );
}
