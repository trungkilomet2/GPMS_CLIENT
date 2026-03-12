import { getStoredUser } from "@/lib/authStorage";
import DashboardLayout from "@/layouts/DashboardLayout";
import MainLayout from "@/layouts/MainLayout";

export default function OwnerLayout({ children }) {
  const user = getStoredUser();
  const role = String(user?.role ?? "").toLowerCase();

  if (role === "owner") {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  return <MainLayout>{children}</MainLayout>;
}
