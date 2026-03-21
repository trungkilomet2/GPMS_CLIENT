import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  UserRound,
  XCircle,
} from "lucide-react";
import OwnerLayout from "@/layouts/OwnerLayout";
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

export default function LeaveRequestDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isWorkerView = location.pathname.startsWith("/worker/leave-requests");
  const backPath = isWorkerView ? "/worker/leave-requests" : "/leave-requests";
  const [leave, setLeave] = useState(location.state?.leave ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

    return [
      {
        title: "Đơn đã được gửi",
        value: formatLeaveDateTime(leave?.dateCreate),
      },
      {
        title: leave?.status === "pending" ? "Đang chờ xét duyệt" : "Đã có phản hồi",
        value: leave?.status === "pending" ? "Đơn đang chờ xử lý." : formatLeaveDateTime(leave?.dateReply),
      },
      {
        title: isApproved ? "Đã duyệt" : isRejected ? "Bị từ chối" : "Kết quả xử lý",
        value: isApproved
          ? "Đơn nghỉ đã được phê duyệt."
          : isRejected
            ? leave?.denyContent || "Đơn nghỉ đã bị từ chối."
            : "Chưa có phản hồi cuối cùng.",
      },
    ];
  }, [leave]);

  return (
    <OwnerLayout>
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
              <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 p-6 text-white shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(backPath)}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                    >
                      <ArrowLeft size={16} />
                      Quay lại
                    </button>
                    <div className="hidden h-8 w-px bg-white/20 sm:block" />
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-emerald-100/80">
                        {isWorkerView ? "Worker Leave Request" : "My Leave Request"}
                      </div>
                      <h1 className="mt-1 text-2xl font-bold">Chi tiết đơn nghỉ #{leave.id}</h1>
                    </div>
                  </div>

                  <StatusBadge status={leave.status} />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <div className="text-xs uppercase tracking-wide text-emerald-100/80">Người gửi</div>
                    <div className="mt-2 text-lg font-semibold">{leave.userFullName}</div>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <div className="text-xs uppercase tracking-wide text-emerald-100/80">Ngày tạo đơn</div>
                    <div className="mt-2 text-lg font-semibold">{formatLeaveDateTime(leave.dateCreate)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <div className="text-xs uppercase tracking-wide text-emerald-100/80">Ngày phản hồi</div>
                    <div className="mt-2 text-lg font-semibold">{formatLeaveDateTime(leave.dateReply)}</div>
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
                        : leave.status === "approved"
                          ? "Đơn nghỉ của bạn đã được phê duyệt."
                          : "Đơn nghỉ đang chờ người có thẩm quyền xem xét."}
                    </div>
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
    </OwnerLayout>
  );
}
