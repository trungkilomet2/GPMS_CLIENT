import { Navigate } from "react-router-dom";
import { getStoredUser } from "@/lib/authStorage";
import { extractRoleValue } from "@/lib/authIdentity";
import { canManageLeaveRequests, getDefaultRouteForRole } from "@/lib/roleAccess";

export default function LeaveRouteGuard({ children }) {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleValue = extractRoleValue(user) || user?.role || user?.roles || "";

  if (canManageLeaveRequests(roleValue)) {
    return children;
  }

  return <Navigate to={getDefaultRouteForRole(roleValue)} replace />;
}
