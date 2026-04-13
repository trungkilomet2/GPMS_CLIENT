import { Navigate } from "react-router-dom";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";
import ProfileEdit from "@/pages/profile/ProfileEdit";
import InternalProfileEdit from "@/pages/profile/InternalProfileEdit";

export default function ProfileEditGate() {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;

  const primaryRole = getPrimaryWorkspaceRole(user?.role);
  return primaryRole === "customer" ? <ProfileEdit /> : <InternalProfileEdit />;
}

