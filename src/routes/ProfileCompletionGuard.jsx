import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthItem, getStoredUser } from "@/lib/authStorage";
import { isProfileComplete } from "@/lib/profileCompletion";

const ALLOW_PATHS_WHEN_INCOMPLETE = new Set([
  "/login",
  "/register",
  "/profile/edit",
]);

export default function ProfileCompletionGuard({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [authTick, setAuthTick] = useState(0);

  useEffect(() => {
    const onAuthChange = () => setAuthTick((t) => t + 1);
    window.addEventListener("auth-change", onAuthChange);
    return () => window.removeEventListener("auth-change", onAuthChange);
  }, []);

  useEffect(() => {
    const token = getAuthItem("token");
    if (!token) return;

    const user = getStoredUser();
    if (!user) return;

    const pathname = location.pathname || "/";
    const isAllowed = ALLOW_PATHS_WHEN_INCOMPLETE.has(pathname);

    if (!isAllowed && !isProfileComplete(user)) {
      navigate("/profile/edit", {
        replace: true,
        state: { forceProfileCompletion: true, from: pathname },
      });
    }
  }, [authTick, location.pathname, navigate]);

  return children;
}

