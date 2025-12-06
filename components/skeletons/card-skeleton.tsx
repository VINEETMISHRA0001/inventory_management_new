'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CardSkeletonProps {
  count?: number;
  showDescription?: boolean;
  showFooter?: boolean;
}

/**
 * CardSkeleton component displays skeleton loaders matching card layout.
 * Use this when loading card data to maintain layout consistency.
 */
export function CardSkeleton({
  count = 1,
  showDescription = true,
  showFooter = false,
}: CardSkeletonProps) {
  return (
    <SkeletonTheme baseColor="hsl(var(--muted))" highlightColor="hsl(var(--muted) / 0.5)">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="relative overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton height={16} width={120} />
              <Skeleton height={40} width={40} borderRadius={8} />
            </div>
            {showDescription && (
              <Skeleton height={14} width={180} style={{ marginTop: '8px' }} />
            )}
            <Skeleton height={36} width={100} style={{ marginTop: '12px' }} />
          </CardHeader>
          {showFooter && (
            <CardContent>
              <Skeleton height={14} width="100%" />
            </CardContent>
          )}
        </Card>
      ))}
    </SkeletonTheme>
  );
}

