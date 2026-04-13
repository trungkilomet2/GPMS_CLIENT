import { Navigate } from "react-router-dom";
import { getStoredUser } from "@/lib/authStorage";
import { hasAnyRole } from "@/lib/roleAccess";
import ProfileEdit from "@/pages/profile/ProfileEdit";
import InternalProfileEdit from "@/pages/profile/InternalProfileEdit";

export default function ProfileEditGate() {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;

  const isCustomer = hasAnyRole(user?.role, ["customer"]);
  return isCustomer ? <ProfileEdit /> : <InternalProfileEdit />;
}

