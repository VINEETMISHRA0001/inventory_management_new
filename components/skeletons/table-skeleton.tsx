'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TableSkeletonProps {
  rows?: number;
  columns: number;
  showHeader?: boolean;
  columnWidths?: (string | number)[];
}

/**
 * TableSkeleton component displays a skeleton loader matching table layout.
 * Use this when loading table data to maintain layout consistency.
 */
export function TableSkeleton({
  rows = 10,
  columns,
  showHeader = true,
  columnWidths,
}: TableSkeletonProps) {
  return (
    <SkeletonTheme baseColor="hsl(var(--muted))" highlightColor="hsl(var(--muted) / 0.5)">
      <div className="overflow-x-auto">
        <Table>
          {showHeader && (
            <TableHeader>
              <TableRow>
                {Array.from({ length: columns }).map((_, i) => (
                  <TableHead key={i}>
                    <Skeleton
                      height={20}
                      width={columnWidths?.[i] || '100%'}
                      style={{ maxWidth: '200px' }}
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
          )}
          <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: columns }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton
                      height={16}
                      width={columnWidths?.[j] || '100%'}
                      style={{ maxWidth: '200px' }}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SkeletonTheme>
  );
}

