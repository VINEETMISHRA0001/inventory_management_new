'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { GalleryVerticalEnd } from 'lucide-react';
import { LoginForm } from '@/components/login-form';
import { Spotlight } from '@/components/ui/spotlight';
import { APP_CONFIG, APP_PATHS } from '@/lib/constants';
import type { RootState } from '@/store/store';

/**
 * LoginPage renders the main login page with a two-column layout.
 * On larger screens, displays a simple login form on the left with security icon and grid pattern,
 * and a dark right side with grid lines and spotlight effect.
 * Redirects authenticated users to dashboard. All company branding and navigation paths are loaded from constants.
 */
export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Only redirect if mounted and authenticated (not loading)
    if (isMounted && isAuthenticated && !isLoading) {
      router.push(APP_PATHS.DASHBOARD);
    }
  }, [isMounted, isAuthenticated, isLoading, router]);

  // Show nothing while checking auth state
  if (!isMounted || (isAuthenticated && !isLoading)) {
    return null;
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative flex flex-col gap-4 p-6 md:p-10 border-r border-border/50 bg-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]" />
        
        <div className="relative z-10 flex justify-center gap-2 md:justify-start animate-in fade-in slide-in-from-left-4 duration-500">
          <a
            href={APP_PATHS.HOME}
            className="flex items-center gap-2 font-medium hover:opacity-80 transition-opacity"
          >
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md shadow-sm">
              <GalleryVerticalEnd className="size-4" />
            </div>
            {APP_CONFIG.COMPANY_NAME}
          </a>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs animate-in fade-in slide-in-from-bottom-6 duration-700">
            <LoginForm />
          </div>
        </div>
      </div>

      <div className="relative hidden lg:flex items-center justify-center bg-black/[0.96] antialiased overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02]" />
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
        
        <div className="relative z-10 p-4 max-w-7xl mx-auto w-full pt-20 md:pt-0">
          <h1 className="text-4xl md:text-7xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50">
            Secure <br /> Authentication
          </h1>
          <p className="mt-4 font-normal text-base text-neutral-300 max-w-lg text-center mx-auto">
            Your data is protected with enterprise-grade security and encryption.
            Login with confidence.
          </p>
        </div>
      </div>
    </div>
  );
}
