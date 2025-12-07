'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SIDEBAR_CONFIG, APP_PATHS, API_ENDPOINTS } from '@/lib/constants';
import { apiClient } from '@/lib/api-client';
import { fetchUser } from '@/store/slices/authSlice';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import Image from 'next/image';
import { StockMovementAnalytics } from '@/components/stock-movement-analytics';
import type { AppDispatch, RootState } from '@/store/store';

/**
 * Stock Management page provides overview of stock across all warehouses.
 * Displays live stock preview: Available, Reserved, In Transit, Damaged.
 */
export default function StockManagementPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector(
    (state: RootState) => state.auth
  );
  const [isMounted, setIsMounted] = useState(false);
  const [stockData, setStockData] = useState({
    available: 0,
    reserved: 0,
    inTransit: 0,
    damaged: 0,
  });

  const fetchStockOverview = useCallback(async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.STOCK.OVERVIEW);
      setStockData(response.data as typeof stockData);
    } catch (error) {
      console.error('Failed to fetch stock overview:', error);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    fetchStockOverview();
  }, [fetchStockOverview]);

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
      title: 'Damaged Stock',
      value: stockData.damaged.toLocaleString(),
      description: 'Items requiring attention',
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10 dark:bg-destructive/20',
    },
    {
      title: 'Logs and More',
      value: '—',
      description: 'View detailed stock movement logs',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      isInteractive: true,
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
                <h1 className="text-3xl font-bold tracking-tight">
                  Stock Management
                </h1>
                <p className="text-muted-foreground mt-1">
                  Live stock preview across all warehouses
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                {stockCards.map((card) => {
                  const IconComponent = card.icon;
                  const isLogsCard = card.isInteractive;

                  if (isLogsCard) {
                    // Special design for Logs card - action card style
                    return (
                      <Card
                        key={card.title}
                        className="relative overflow-hidden border-2 border-blue-300 dark:border-blue-700 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 hover:shadow-2xl hover:scale-[1.02] cursor-pointer transition-all duration-300 group hover:border-blue-500 dark:hover:border-blue-400 hover:from-blue-100 hover:via-indigo-100 hover:to-purple-100 dark:hover:from-blue-900 dark:hover:via-indigo-900 dark:hover:to-purple-900"
                        onClick={() =>
                          router.push(APP_PATHS.STOCK_MOVEMENT_LOGS)
                        }
                      >
                        {/* Animated background elements */}
                        <div className="absolute right-0 top-0 h-32 w-32 bg-blue-400/20 dark:bg-blue-600/20 rounded-bl-full animate-pulse group-hover:bg-blue-500/30 dark:group-hover:bg-blue-500/30 transition-colors duration-300" />
                        <div className="absolute left-0 bottom-0 h-24 w-24 bg-indigo-400/20 dark:bg-indigo-600/20 rounded-tr-full animate-pulse delay-300 group-hover:bg-indigo-500/30 dark:group-hover:bg-indigo-500/30 transition-colors duration-300" />
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-indigo-400/5 dark:from-blue-500/10 dark:to-indigo-500/10 group-hover:from-blue-400/10 group-hover:to-indigo-400/10 dark:group-hover:from-blue-500/20 dark:group-hover:to-indigo-500/20 transition-all duration-300" />

                        {/* Circle fill animation on hover */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 rounded-full bg-blue-400/20 dark:bg-blue-500/20 group-hover:w-[300px] group-hover:h-[300px] transition-all duration-700 ease-out" />
                        </div>

                        <CardContent className="relative p-6 flex flex-col items-center justify-center min-h-[200px] text-center z-10">
                          <div className="mb-4 relative">
                            {/* Circle fill animation background */}
                            <div className="absolute inset-0 bg-blue-400/10 dark:bg-blue-600/10 rounded-full scale-0 group-hover:scale-150 transition-transform duration-700 ease-out" />
                            <div className="relative bg-blue-100 dark:bg-blue-900 rounded-full p-4 group-hover:scale-110 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-all duration-300">
                              <div className="relative w-16 h-16 flex items-center justify-center">
                                <Image
                                  src="/assets/checklist.png"
                                  alt="Checklist"
                                  width={64}
                                  height={64}
                                  className="object-contain w-full h-full group-hover:scale-110 transition-transform duration-300"
                                  priority
                                />
                              </div>
                            </div>
                          </div>
                          <CardTitle className="text-xl font-bold mb-2 text-blue-900 dark:text-blue-100 group-hover:text-blue-800 dark:group-hover:text-blue-200 transition-colors duration-300">
                            {card.title}
                          </CardTitle>
                          <CardDescription className="text-sm mb-4 text-blue-700 dark:text-blue-300 group-hover:text-blue-600 dark:group-hover:text-blue-200 transition-colors duration-300">
                            {card.description}
                          </CardDescription>
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-12 h-12 rounded-full border-2 border-dashed border-gray-400 dark:border-white/40 bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 hover:border-gray-600 dark:hover:border-white/60 group/btn transition-all duration-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(APP_PATHS.STOCK_MOVEMENT_LOGS);
                            }}
                          >
                            <ArrowUpRight className="size-5 text-gray-700 dark:text-white group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform duration-300" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  }

                  // Regular statistics cards
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
                          <CardDescription className="text-sm font-medium">
                            {card.title}
                          </CardDescription>
                          <div className={`rounded-lg p-2 ${card.bgColor}`}>
                            <IconComponent className={`size-5 ${card.color}`} />
                          </div>
                        </div>
                        <CardTitle className="text-3xl font-bold tabular-nums">
                          {card.value}
                        </CardTitle>
                      </CardHeader>
                      <CardFooter className="relative text-sm text-muted-foreground">
                        {card.description}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>

              {/* Stock Movement Analytics */}
              <StockMovementAnalytics />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
