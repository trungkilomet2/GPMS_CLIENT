import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import OwnerLayout from "@/layouts/OwnerLayout";
import { getStoredUser } from "@/lib/authStorage";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const MOCK_ASSIGNMENTS = [
  {
    id: 1,
    workerName: "My",
    productionId: 1001,
    orderName: "Đồng phục công ty ABC",
    partName: "Diễu nẹp cổ",
    cpu: 800,
    startDate: "2026-04-22",
    endDate: "2026-04-23",
  },
  {
    id: 2,
    workerName: "My",
    productionId: 1001,
    orderName: "Đồng phục công ty ABC",
    partName: "Đính mác",
    cpu: 200,
    startDate: "2026-04-23",
    endDate: "2026-04-24",
  },
  {
    id: 3,
    workerName: "Hoa A",
    productionId: 1001,
    orderName: "Đồng phục công ty ABC",
    partName: "Chạy dây lồng cổ",
    cpu: 500,
    startDate: "2026-04-25",
    endDate: "2026-04-26",
  },
  {
    id: 4,
    workerName: "Hoa A",
    productionId: 1002,
    orderName: "Áo hoodie mùa đông",
    partName: "Kiểm hàng",
    cpu: 100,
    startDate: "2026-04-28",
    endDate: "2026-04-29",
  },
];

export default function WorkerAssignment() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const displayName = user?.fullName || user?.name || "Thợ may";

  const assignments = useMemo(() => MOCK_ASSIGNMENTS, []);

  return (
    <OwnerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <button
                onClick={() => navigate(-1)}
                className="mt-1 rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Công việc được phân công</h1>
                <p className="text-slate-600">Theo dõi các công đoạn bạn cần thực hiện.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/worker/daily-report")}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Báo cáo sản lượng
              </button>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {displayName}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-600 mb-4">
              <ClipboardCheck size={16} />
              <h2 className="text-xs font-bold uppercase tracking-widest">Danh sách công việc</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-200 table-fixed text-sm">
                <thead className="leave-table-head">
                  <tr>
                    <th className="leave-table-th w-14 px-3 py-3 text-center">STT</th>
                    <th className="leave-table-th w-36 px-3 py-3 text-left">Production</th>
                    <th className="leave-table-th w-44 px-3 py-3 text-left">Đơn hàng</th>
                    <th className="leave-table-th w-52 px-3 py-3 text-left">Công đoạn</th>
                    <th className="leave-table-th w-28 px-3 py-3 text-center">Đơn giá</th>
                    <th className="leave-table-th w-28 px-3 py-3 text-center">Bắt đầu</th>
                    <th className="leave-table-th w-28 px-3 py-3 text-center">Kết thúc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        Chưa có công việc nào được phân công.
                      </td>
                    </tr>
                  ) : (
                    assignments.map((item, index) => (
                      <tr key={item.id} className="leave-table-row hover:bg-slate-50/80">
                        <td className="px-3 py-2 text-center">{index + 1}</td>
                        <td className="px-3 py-2 text-slate-700">#PR-{item.productionId}</td>
                        <td className="px-3 py-2 text-slate-700">{item.orderName}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{item.partName}</td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-700">
                          {item.cpu ? `${item.cpu.toLocaleString("vi-VN")} VND` : "-"}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-600">{item.startDate}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{item.endDate}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </OwnerLayout>
  );
}
