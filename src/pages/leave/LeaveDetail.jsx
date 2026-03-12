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
  ShieldAlert,
  UserRound,
  XCircle,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
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
};

function formatDateTime(value) {
  if (!value) return "Chưa cập nhật";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Không hợp lệ";

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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

export default function LeaveDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [leave, setLeave] = useState(location.state?.leave ?? null);
  const [loading, setLoading] = useState(!location.state?.leave);
  const [error, setError] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (location.state?.leave) return;

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
  }, [id, location.state?.leave]);

  const statusConfig = useMemo(
    () => STATUS_MAP[leave?.status] ?? STATUS_MAP.pending,
    [leave?.status]
  );
  const canReview = leave?.status === "pending";

  const handleApprove = async () => {
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setLeave((prev) => ({
      ...prev,
      status: "approved",
      dateReply: new Date().toISOString(),
      denyContent: "",
    }));
    setSubmitting(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;

    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setLeave((prev) => ({
      ...prev,
      status: "rejected",
      dateReply: new Date().toISOString(),
      denyContent: rejectReason.trim(),
    }));
    setRejectOpen(false);
    setRejectReason("");
    setSubmitting(false);
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
                <div className="mt-1 text-sm text-emerald-100/90">User ID: {leave.userId ?? "N/A"}</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <div className="text-xs uppercase tracking-wide text-emerald-100/80">Ngày tạo đơn</div>
                <div className="mt-2 text-lg font-semibold">{formatDateTime(leave.dateCreate)}</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <div className="text-xs uppercase tracking-wide text-emerald-100/80">Ngày phản hồi</div>
                <div className="mt-2 text-lg font-semibold">{formatDateTime(leave.dateReply)}</div>
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

                {canReview && rejectOpen && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Lý do từ chối</label>
                    <textarea
                      rows={4}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Nhập nội dung phản hồi để lưu vào denyContent..."
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
                  <DetailItem icon={ShieldAlert} label="User ID" value={leave.userId} />
                  <DetailItem icon={Phone} label="Số điện thoại" value="" />
                  <DetailItem icon={Mail} label="Email" value="" />
                  <DetailItem icon={MapPin} label="Địa chỉ" value="" />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Timeline xử lý</h2>
                <div className="mt-5 space-y-4">
                  {[
                    {
                      title: "Đơn được tạo",
                      value: formatDateTime(leave.dateCreate),
                      active: true,
                    },
                    {
                      title: leave.status === "pending" ? "Chờ phản hồi" : "Đã phản hồi",
                      value: leave.status === "pending" ? "Đang chờ duyệt" : formatDateTime(leave.dateReply),
                      active: leave.status !== "pending",
                    },
                    {
                      title: leave.status === "rejected" ? "Lý do từ chối" : "Kết quả xử lý",
                      value:
                        leave.status === "rejected"
                          ? leave.denyContent || "Chưa có lý do"
                          : leave.status === "approved"
                            ? "Đơn đã được phê duyệt"
                            : "Chưa có kết quả cuối cùng",
                      active: leave.status !== "pending",
                    },
                  ].map((item, index) => (
                    <div key={item.title} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`mt-1 h-3 w-3 rounded-full ${item.active ? "bg-emerald-500" : "bg-slate-300"}`} />
                        {index < 2 && <div className="mt-2 h-full w-px bg-slate-200" />}
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
