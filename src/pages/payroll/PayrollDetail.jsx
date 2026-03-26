import { useParams } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";

export default function PayrollDetail() {
  const { employeeId } = useParams();

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-emerald-100 bg-white/90 p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">Chi tiết lương</h1>
          <p className="mt-3 text-base text-slate-600">
            Chưa có giao diện chi tiết lương cho nhân viên <strong>#{employeeId}</strong>. Route đã sẵn sàng để tránh lỗi build và lỗi điều hướng.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
