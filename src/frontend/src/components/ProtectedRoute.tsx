import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useIsCallerAdmin, useIsCallerApproved } from "../hooks/useQueries";
import { getTeamSession } from "../lib/auctionStore";
import { ADMIN_SESSION_EVENT, getAdminSession } from "../lib/authConstants";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireApproval?: boolean;
  requireTeamSession?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAdmin,
  requireApproval,
  requireTeamSession,
}: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { identity, isInitializing } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const [isAdminSession, setIsAdminSession] = useState<boolean>(() =>
    getAdminSession(),
  );

  useEffect(() => {
    const handleAdminSessionChange = () => {
      setIsAdminSession(getAdminSession());
    };
    window.addEventListener(ADMIN_SESSION_EVENT, handleAdminSessionChange);
    window.addEventListener("storage", handleAdminSessionChange);
    return () => {
      window.removeEventListener(ADMIN_SESSION_EVENT, handleAdminSessionChange);
      window.removeEventListener("storage", handleAdminSessionChange);
    };
  }, []);

  const {
    data: isApproved,
    isLoading: approvalLoading,
    isFetched: approvalFetched,
  } = useIsCallerApproved();

  const {
    data: isAdmin,
    isLoading: adminLoading,
    isFetched: adminFetched,
  } = useIsCallerAdmin();

  const spinner = (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  // --- Admin route (passcode-based session) ---
  if (requireAdmin && isAdminSession) {
    return <>{children}</>;
  }

  // --- Admin route (II-based admin fallback) ---
  if (requireAdmin && !isAdminSession) {
    if (isInitializing) return spinner;
    if (!isAuthenticated) {
      navigate({ to: "/admin/login" });
      return null;
    }
    if (adminLoading) return spinner;
    if (adminFetched && !isAdmin) {
      navigate({ to: "/admin/login" });
      return null;
    }
    if (adminFetched && isAdmin) return <>{children}</>;
    return spinner;
  }

  // --- Approval-required route (team dashboard) ---
  if (requireApproval) {
    if (isInitializing) return spinner;
    if (!isAuthenticated) {
      navigate({ to: "/team/login" });
      return null;
    }
    if (approvalLoading) return spinner;
    if (approvalFetched && !isApproved) {
      navigate({ to: "/team/login" });
      return null;
    }
    if (approvalFetched && isApproved) return <>{children}</>;
    return spinner;
  }

  // --- Team session route ---
  if (requireTeamSession) {
    const session = getTeamSession();
    if (!session) {
      navigate({ to: "/team/login" });
      return null;
    }
    return <>{children}</>;
  }

  return <>{children}</>;
}
