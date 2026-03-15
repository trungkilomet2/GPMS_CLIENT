import { getStoredUser } from "@/lib/authStorage";
import DashboardLayout from "@/layouts/DashboardLayout";
import TeamLeaderLayout from "@/layouts/TeamLeaderLayout";
import WorkerLayout from "@/layouts/WorkerLayout";
import MainLayout from "@/layouts/MainLayout";

function splitRoles(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);

  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function OwnerLayout({ children }) {
  const user = getStoredUser();
  const roles = splitRoles(user?.role).map((role) => role.toLowerCase());

  if (roles.includes("owner")) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  if (roles.includes("team leader") || roles.includes("teamleader") || roles.includes("tl")) {
    return <TeamLeaderLayout>{children}</TeamLeaderLayout>;
  }

  if (roles.includes("worker") || roles.includes("sewer") || roles.includes("tailor")) {
    return <WorkerLayout>{children}</WorkerLayout>;
  }

  return <MainLayout>{children}</MainLayout>;
}
