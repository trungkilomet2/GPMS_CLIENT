import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, DollarSign, Calendar, Users, Clock, CheckCircle2, Clock as ClockIcon } from "lucide-react";
import WorkerLayout from "@/layouts/WorkerLayout";
import { getStoredUser } from "@/lib/authStorage";
import Pagination from "@/components/Pagination";
import "@/styles/homepage.css";
import "@/styles/leave.css";
import "@/styles/worker-assignment.css";

const RAW_ASSIGNMENTS = [
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
  {
    id: 5,
    workerName: "Minh",
    productionId: 1002,
    orderName: "Áo hoodie mùa đông",
    partName: "Tra dây rút",
    cpu: 350,
    startDate: "2026-04-29",
    endDate: "2026-04-30",
  },
  {
    id: 6,
    workerName: "Linh",
    productionId: 1003,
    orderName: "Áo polo sự kiện",
    partName: "May sườn",
    cpu: 420,
    startDate: "2026-05-01",
    endDate: "2026-05-02",
  },
  {
    id: 7,
    workerName: "Linh",
    productionId: 1003,
    orderName: "Áo polo sự kiện",
    partName: "Đóng nút",
    cpu: 180,
    startDate: "2026-05-02",
    endDate: "2026-05-03",
  },
  {
    id: 8,
    workerName: "Khoa",
    productionId: 1004,
    orderName: "Váy đồng phục nhà hàng",
    partName: "May khóa kéo",
    cpu: 520,
    startDate: "2026-05-03",
    endDate: "2026-05-04",
  },
  {
    id: 9,
    workerName: "Khoa",
    productionId: 1004,
    orderName: "Váy đồng phục nhà hàng",
    partName: "Lên lai",
    cpu: 210,
    startDate: "2026-05-04",
    endDate: "2026-05-05",
  },
  {
    id: 10,
    workerName: "Huy",
    productionId: 1005,
    orderName: "Áo khoác gió",
    partName: "May túi",
    cpu: 300,
    startDate: "2026-05-05",
    endDate: "2026-05-06",
  },
  {
    id: 11,
    workerName: "Huy",
    productionId: 1005,
    orderName: "Áo khoác gió",
    partName: "May bo tay",
    cpu: 260,
    startDate: "2026-05-06",
    endDate: "2026-05-07",
  },
  {
    id: 12,
    workerName: "Trang",
    productionId: 1006,
    orderName: "Quần tây văn phòng",
    partName: "Tra lưng",
    cpu: 380,
    startDate: "2026-05-07",
    endDate: "2026-05-08",
  },
  {
    id: 13,
    workerName: "Trang",
    productionId: 1006,
    orderName: "Quần tây văn phòng",
    partName: "Vắt sổ",
    cpu: 140,
    startDate: "2026-05-08",
    endDate: "2026-05-09",
  },
  {
    id: 14,
    workerName: "Nam",
    productionId: 1007,
    orderName: "Áo sơ mi công sở",
    partName: "May cổ",
    cpu: 460,
    startDate: "2026-05-09",
    endDate: "2026-05-10",
  },
  {
    id: 15,
    workerName: "Nam",
    productionId: 1007,
    orderName: "Áo sơ mi công sở",
    partName: "May tay",
    cpu: 400,
    startDate: "2026-05-10",
    endDate: "2026-05-11",
  },
];

export default function WorkerAssignment() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const displayName = user?.fullName || user?.name || "Thợ may";

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const assignments = useMemo(() => RAW_ASSIGNMENTS.map((item, idx) => ({
    ...item,
    status: idx % 4 === 0 ? 'upcoming' : idx % 4 === 1 ? 'progress' : idx % 4 === 2 ? 'completed' : 'overdue',
  })), []);
  const totalPages = Math.max(1, Math.ceil(assignments.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages || 1);
  }, [currentPage, totalPages]);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return assignments.slice(start, start + pageSize);
  }, [assignments, currentPage, pageSize]);
  const handleReportOutput = (item) => {
    navigate("/worker/daily-report", { state: { assignment: item } });
  };

  return (
    <WorkerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Công việc được phân công</h1>
                <p className="text-slate-600">Theo dõi các công đoạn bạn cần thực hiện. Bấm để báo cáo sản lượng.</p>
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
                    <th className="leave-table-th w-28 px-3 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-500">
                        Chưa có công việc nào được phân công.
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((item, index) => (
                      <tr key={item.id} className="leave-table-row hover:bg-slate-50/80">
                        <td className="px-3 py-2 text-center">{(currentPage - 1) * pageSize + index + 1}</td>
                        <td className="px-3 py-2 text-slate-700">#PR-{item.productionId}</td>
                        <td className="px-3 py-2 text-slate-700">{item.orderName}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{item.partName}</td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-700">
                          {item.cpu ? `${item.cpu.toLocaleString("vi-VN")} VND` : "-"}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-600">{item.startDate}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{item.endDate}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleReportOutput(item)}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            Báo cáo sản lượng
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {assignments.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalCount={assignments.length}
                pageSize={pageSize}
              />
            )}

          </div>
        </div>
      </div>
    </WorkerLayout>
  );
}








