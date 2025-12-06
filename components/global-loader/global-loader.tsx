'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * GlobalLoader component displays a loading overlay when API requests are in progress.
 * Automatically shows/hides based on axios interceptors tracking request count.
 */
export function GlobalLoader() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = apiClient.onLoadingChange(setIsLoading);
    return unsubscribe;
  }, []);

  if (!isLoading) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9999] flex items-center justify-center',
        'bg-background/80 backdrop-blur-sm',
        'transition-opacity duration-200'
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

