'use client';

import { SectionCards } from '@/components/section-cards';
import { ProductsTable } from '@/components/products-table';
import { DashboardLayout } from '@/components/dashboard-layout/dashboard-layout';

/**
 * Dashboard page renders the main inventory management dashboard with sidebar navigation,
 * statistics cards, and products table. Protected route that requires authentication.
 */
export default function Page() {
  return (
    <DashboardLayout>
      <SectionCards />
      <ProductsTable />
    </DashboardLayout>
  );
}
