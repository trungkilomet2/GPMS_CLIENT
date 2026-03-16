import WorkerSidebar from "@/components/layout/WorkerSidebar";

export default function WorkerLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#c5dbbf]">
      <WorkerSidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
