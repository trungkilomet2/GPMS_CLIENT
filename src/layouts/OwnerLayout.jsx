import DashboardLayout from "@/layouts/DashboardLayout";
import TeamLeaderLayout from "@/layouts/TeamLeaderLayout";
import WorkerLayout from "@/layouts/WorkerLayout";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";

export default function OwnerLayout({ children }) {
  const user = getStoredUser();
  const primaryRole = getPrimaryWorkspaceRole(user?.role);

  if (primaryRole === "teamLeader") {
    return <TeamLeaderLayout>{children}</TeamLeaderLayout>;
  }

  if (primaryRole === "worker") {
    return <WorkerLayout>{children}</WorkerLayout>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
