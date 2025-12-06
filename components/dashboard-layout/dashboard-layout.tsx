'use client';

import { useEffect, useState, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { SIDEBAR_CONFIG, APP_PATHS, STORAGE_KEYS } from '@/lib/constants';
import { fetchUser } from '@/store/slices/authSlice';
import type { AppDispatch, RootState } from '@/store/store';

interface DashboardLayoutProps {
  children: ReactNode;
}

// Global ref to track if auth has been checked (persists across navigation)
const globalAuthChecked = { current: false };

/**
 * DashboardLayout component provides consistent layout for all dashboard pages.
 * Shows layout immediately and only shows loading in content area during transitions.
 * Handles authentication checks without blocking the UI or causing page reloads.
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading, user } = useSelector(
    (state: RootState) => state.auth
  );
  const [isMounted, setIsMounted] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const redirectingRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Only check auth once globally, not on every navigation
  useEffect(() => {
    if (!isMounted) return;

    // If auth already checked globally, just set initial load to false
    if (globalAuthChecked.current) {
      setIsInitialLoad(false);
      return;
    }

    const checkAuth = async () => {
      globalAuthChecked.current = true;

      // If already authenticated with user data, just verify token is still valid (silently)
      if (isAuthenticated && user) {
        try {
          await dispatch(fetchUser()).unwrap();
        } catch {
          // Token invalid, but don't redirect immediately - let user continue
          // The auth state will update and handle it
        }
        setIsInitialLoad(false);
        return;
      }

      // Not authenticated, try to fetch user
      try {
        await dispatch(fetchUser()).unwrap();
        setIsInitialLoad(false);
      } catch {
        // Not authenticated, check if we have a token in storage
        const hasToken =
          typeof window !== 'undefined' &&
          (localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) ||
            sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN));

        if (
          !hasToken &&
          !redirectingRef.current &&
          pathname !== APP_PATHS.LOGIN
        ) {
          redirectingRef.current = true;
          router.push(APP_PATHS.LOGIN);
        }
        setIsInitialLoad(false);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted]);

  // Only redirect if we're sure user is not authenticated and no token exists (and not already on login)
  useEffect(() => {
    if (
      !globalAuthChecked.current ||
      redirectingRef.current ||
      pathname === APP_PATHS.LOGIN
    )
      return;

    // Only redirect if auth check is complete, not loading, and definitely not authenticated
    if (isMounted && !isLoading && !isAuthenticated) {
      const hasToken =
        typeof window !== 'undefined' &&
        (localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) ||
          sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN));

      if (!hasToken && !redirectingRef.current) {
        redirectingRef.current = true;
        router.push(APP_PATHS.LOGIN);
      }
    }
  }, [isMounted, isLoading, isAuthenticated, router, pathname]);

  const showContentLoader = !isMounted || (isInitialLoad && isLoading);

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': SIDEBAR_CONFIG.WIDTH,
          '--header-height': SIDEBAR_CONFIG.HEADER_HEIGHT,
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              {showContentLoader ? (
                <div className="flex min-h-[400px] items-center justify-center">
                  <div className="text-muted-foreground">Loading...</div>
                </div>
              ) : (
                children
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
