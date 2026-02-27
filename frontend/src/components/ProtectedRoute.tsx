import React, { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useIsCallerAdmin, useIsCallerApproved } from '../hooks/useQueries';
import LoadingScreen from './LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireApproval?: boolean;
}

export default function ProtectedRoute({ children, requireApproval = false }: ProtectedRouteProps) {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: isAdmin, isLoading: adminLoading, isFetched: adminFetched } = useIsCallerAdmin();
  const { data: isApproved, isLoading: approvalLoading, isFetched: approvalFetched } = useIsCallerApproved();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  const isAuthenticated = !!identity;

  // Determine if we're still loading relevant data
  const isLoading =
    isInitializing ||
    (isAuthenticated && requireApproval && approvalLoading) ||
    (isAuthenticated && !requireApproval && adminLoading);

  useEffect(() => {
    if (isInitializing) return;
    if (hasRedirected.current) return;

    // Not authenticated at all → redirect to login
    if (!isAuthenticated) {
      hasRedirected.current = true;
      void navigate({
        to: requireApproval ? '/team/login' : '/admin/login',
        replace: true,
      });
      return;
    }

    if (requireApproval) {
      // Wait for approval check to complete
      if (!approvalFetched || approvalLoading) return;
      if (!isApproved) {
        hasRedirected.current = true;
        void navigate({ to: '/team/login', replace: true });
      }
      return;
    }

    // Admin route: wait for admin check to complete
    if (!adminFetched || adminLoading) return;
    if (!isAdmin) {
      hasRedirected.current = true;
      void navigate({ to: '/admin/login', replace: true });
    }
  }, [
    isInitializing,
    isAuthenticated,
    isAdmin,
    adminLoading,
    adminFetched,
    isApproved,
    approvalLoading,
    approvalFetched,
    requireApproval,
    navigate,
  ]);

  // Reset redirect flag when identity changes
  useEffect(() => {
    hasRedirected.current = false;
  }, [identity]);

  // Show loading while initializing or checking permissions
  if (isLoading || isInitializing) {
    return <LoadingScreen />;
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <LoadingScreen />;
  }

  // Approval-based route: waiting for check or not approved
  if (requireApproval) {
    if (!approvalFetched || approvalLoading) return <LoadingScreen />;
    if (!isApproved) return <LoadingScreen />;
  } else {
    // Admin route: waiting for check or not admin
    if (!adminFetched || adminLoading) return <LoadingScreen />;
    if (!isAdmin) return <LoadingScreen />;
  }

  return <>{children}</>;
}
