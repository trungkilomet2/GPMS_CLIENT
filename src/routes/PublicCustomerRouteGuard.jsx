import { Navigate } from "react-router-dom";
import { getStoredUser } from "@/lib/authStorage";
import { getPostLoginPath } from "@/lib/authRouting";
import { hasAnyRole, splitRoles } from "@/lib/internalRoleFlow";

export default function PublicCustomerRouteGuard({ children }) {
  const user = getStoredUser();

  if (!user) {
    return children;
  }

  const roles = splitRoles(user.role);

  if (hasAnyRole(roles, ["customer"])) {
    return children;
  }

  return <Navigate to={getPostLoginPath(roles)} replace />;
}
