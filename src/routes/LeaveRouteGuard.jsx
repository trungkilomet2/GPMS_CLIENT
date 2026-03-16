import { Navigate } from "react-router-dom";
import { getStoredUser } from "@/lib/authStorage";
import { canManageLeaveRequests, getDefaultRouteForRole } from "@/lib/roleAccess";

export default function LeaveRouteGuard({ children }) {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (canManageLeaveRequests(user.role)) {
    return children;
  }

  return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
}
