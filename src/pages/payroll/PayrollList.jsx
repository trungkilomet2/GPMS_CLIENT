import DashboardLayout from "@/layouts/DashboardLayout";

export default function PayrollList() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-emerald-100 bg-white/90 p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">Danh sách lương</h1>
          <p className="mt-3 text-base text-slate-600">
            Màn quản lý lương đang được hoàn thiện. Route này đã được giữ lại để hệ thống điều hướng và build hoạt động ổn định.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
