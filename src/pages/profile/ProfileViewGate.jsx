import { Navigate } from "react-router-dom";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";
import ViewProfile from "@/pages/profile/ViewProfile";
import InternalProfileView from "@/pages/profile/InternalProfileView";

export default function ProfileViewGate() {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;

  const primaryRole = getPrimaryWorkspaceRole(user?.role);
  return primaryRole === "customer" ? <ViewProfile /> : <InternalProfileView />;
}

