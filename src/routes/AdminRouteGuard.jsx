import { Navigate } from "react-router-dom";
import { getStoredUser } from "@/lib/authStorage";
import { extractRoleValue } from "@/lib/authIdentity";
import { getPostLoginPath, hasAnyRole, splitRoles } from "@/lib/authRouting";

export default function AdminRouteGuard({ children }) {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roles = splitRoles(extractRoleValue(user) || user?.role || user?.roles || "");

  if (hasAnyRole(roles, ["admin"])) {
    return children;
  }

  return <Navigate to={getPostLoginPath(roles)} replace />;
}
