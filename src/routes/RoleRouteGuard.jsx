import { Navigate } from "react-router-dom";
import { getStoredUser } from "@/lib/authStorage";
import { getPostLoginPath } from "@/lib/authRouting";
import { hasAnyRole, splitRoles } from "@/lib/internalRoleFlow";

export default function RoleRouteGuard({ children, allowedRoles = [] }) {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roles = splitRoles(user.role);

  if (hasAnyRole(roles, allowedRoles)) {
    return children;
  }

  return <Navigate to={getPostLoginPath(roles)} replace />;
}
