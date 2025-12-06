'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SIDEBAR_CONFIG, APP_PATHS, API_ENDPOINTS } from '@/lib/constants';
import { apiClient } from '@/lib/api-client';
import { fetchUser } from '@/store/slices/authSlice';
import { Package, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Warehouse } from 'lucide-react';
import type { AppDispatch, RootState } from '@/store/store';
import { TableSkeleton } from '@/components/skeletons/table-skeleton';

/**
 * Stock Management page provides overview of stock across all warehouses.
 * Displays live stock preview: Available, Reserved, In Transit, Damaged.
 */
export default function StockManagementPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const [isMounted, setIsMounted] = useState(false);
  const [stockData, setStockData] = useState({
    available: 0,
    reserved: 0,
    inTransit: 0,
    damaged: 0,
  });
  const [warehouseDistribution, setWarehouseDistribution] = useState<
    Array<{
      warehouseId: string;
      warehouseName: string;
      warehouseCode: string;
      address: string;
      city: string;
      state: string;
      totalQuantity: number;
      totalAvailable: number;
      totalReserved: number;
      currentRemaining: number;
      productCount: number;
    }>
  >([]);
  const [isLoadingDistribution, setIsLoadingDistribution] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchStockOverview();
    fetchWarehouseDistribution();
  }, []);

  const fetchStockOverview = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.STOCK.OVERVIEW);
      setStockData(response.data);
    } catch (error) {
      console.error('Failed to fetch stock overview:', error);
    }
  };

  const fetchWarehouseDistribution = async () => {
    setIsLoadingDistribution(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.STOCK.WAREHOUSE_DISTRIBUTION);
      setWarehouseDistribution(response.data.warehouses || []);
    } catch (error) {
      console.error('Failed to fetch warehouse distribution:', error);
    } finally {
      setIsLoadingDistribution(false);
    }
  };

  useEffect(() => {
    if (!isMounted) return;

    if (isAuthenticated) {
      dispatch(fetchUser()).catch(() => {
        router.push(APP_PATHS.LOGIN);
      });
    } else {
      const checkAuth = async () => {
        try {
          await dispatch(fetchUser()).unwrap();
        } catch {
          router.push(APP_PATHS.LOGIN);
        }
      };
      checkAuth();
    }
  }, [dispatch, router, isAuthenticated, isMounted]);

  if (!isMounted || isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const stockCards = [
    {
      title: 'Available Stock',
      value: stockData.available.toLocaleString(),
      description: 'Items ready for sale',
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10 dark:bg-primary/20',
    },
    {
      title: 'Reserved Stock',
      value: stockData.reserved.toLocaleString(),
      description: 'Items reserved for orders',
      icon: CheckCircle2,
      color: 'text-foreground',
      bgColor: 'bg-muted',
    },
    {
      title: 'In Transit',
      value: stockData.inTransit.toLocaleString(),
      description: 'Items being transferred',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
    },
    {
      title: 'Damaged Stock',
      value: stockData.damaged.toLocaleString(),
      description: 'Items requiring attention',
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10 dark:bg-destructive/20',
    },
  ];

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
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Stock Management</h1>
                <p className="text-muted-foreground mt-1">
                  Live stock preview across all warehouses
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                {stockCards.map((card) => {
                  const IconComponent = card.icon;
                  return (
                    <Card
                      key={card.title}
                      className="relative overflow-hidden border-2 transition-all hover:shadow-lg"
                    >
                      <div
                        className={`absolute right-0 top-0 h-24 w-24 ${card.bgColor} opacity-20 rounded-bl-full`}
                      />
                      <CardHeader className="relative">
                        <div className="flex items-center justify-between">
                          <CardDescription className="text-sm font-medium">{card.title}</CardDescription>
                          <div className={`rounded-lg p-2 ${card.bgColor}`}>
                            <IconComponent className={`size-5 ${card.color}`} />
                          </div>
                        </div>
                        <CardTitle className="text-3xl font-bold tabular-nums">{card.value}</CardTitle>
                      </CardHeader>
                      <CardFooter className="relative text-sm text-muted-foreground">
                        {card.description}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Stock by Warehouse</CardTitle>
                  <CardDescription>
                    View stock distribution across all warehouses. Current Remaining = Total Stock - Reserved.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingDistribution ? (
                    <TableSkeleton
                      rows={8}
                      columns={6}
                      columnWidths={[150, 100, 200, 120, 120, 120]}
                    />
                  ) : warehouseDistribution.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Warehouse className="size-12 mx-auto mb-4 opacity-50" />
                      <p>No warehouses found or no stock data available</p>
                      <p className="text-sm mt-2">Add stock to warehouses to see distribution here</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Warehouse</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead className="text-right">Total Stock</TableHead>
                            <TableHead className="text-right">Reserved</TableHead>
                            <TableHead className="text-right">Current Remaining</TableHead>
                            <TableHead className="text-right">Products</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {warehouseDistribution.map((warehouse) => (
                            <TableRow key={warehouse.warehouseId}>
                              <TableCell className="font-medium">
                                {warehouse.warehouseName}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{warehouse.warehouseCode}</Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {[warehouse.city, warehouse.state].filter(Boolean).join(', ') || warehouse.address || '—'}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {warehouse.totalQuantity.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {warehouse.totalReserved.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-primary">
                                {warehouse.currentRemaining.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {warehouse.productCount}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

