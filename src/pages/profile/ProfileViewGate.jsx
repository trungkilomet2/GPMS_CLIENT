import { Navigate } from "react-router-dom";
import { getStoredUser } from "@/lib/authStorage";
import { hasAnyRole } from "@/lib/roleAccess";
import ViewProfile from "@/pages/profile/ViewProfile";
import InternalProfileView from "@/pages/profile/InternalProfileView";

export default function ProfileViewGate() {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;

  const isCustomer = hasAnyRole(user?.role, ["customer"]);
  return isCustomer ? <ViewProfile /> : <InternalProfileView />;
}

