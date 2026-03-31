import DashboardLayout from "@/layouts/DashboardLayout";
import WorkerLayout from "@/layouts/WorkerLayout";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";

export default function PmOwnerLayout({ children }) {
  const user = getStoredUser();
  const primaryRole = getPrimaryWorkspaceRole(user?.role);

  if (primaryRole === "worker") {
    return <WorkerLayout>{children}</WorkerLayout>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
