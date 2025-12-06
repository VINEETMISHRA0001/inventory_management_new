'use client';

import { useEffect, useState } from 'react';
import { Package, Box, AlertTriangle, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/constants';

interface Stats {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  totalValue: number;
}

/**
 * SectionCards component displays key inventory statistics cards with real-time data.
 * Fetches statistics from the API to show accurate inventory metrics.
 */
export function SectionCards() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.STATS);
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    {
      title: 'Total Products',
      value: stats?.totalProducts.toLocaleString() || '0',
      description: 'Products in catalog',
      icon: Box,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      trend: null,
    },
    {
      title: 'Inventory Value',
      value: `₹${stats?.totalValue.toLocaleString('en-IN') || '0'}`,
      description: 'Total stock value',
      icon: Package,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
      trend: null,
    },
    {
      title: 'Low Stock Items',
      value: stats?.lowStockCount.toString() || '0',
      description: 'Items below threshold',
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      trend: (stats?.lowStockCount || 0) > 0 ? 'warning' : null,
    },
    {
      title: 'Active Products',
      value: stats?.activeProducts.toLocaleString() || '0',
      description: 'Currently available',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      trend: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {cards.map((card) => {
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
                <CardDescription className="text-sm font-medium">
                  {card.title}
                </CardDescription>
                <div className={`rounded-lg p-2 ${card.bgColor}`}>
                  <IconComponent className={`size-5 ${card.color}`} />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-9 w-32" />
              ) : (
                <CardTitle className="text-3xl font-bold tabular-nums">
                  {card.value}
                </CardTitle>
              )}
              {card.trend && !isLoading && (
                <CardAction>
                  <Badge
                    variant={
                      card.trend === 'warning' ? 'destructive' : 'outline'
                    }
                  >
                    {card.trend === 'warning' ? 'Action Required' : ''}
                  </Badge>
                </CardAction>
              )}
            </CardHeader>
            <CardFooter className="relative text-sm text-muted-foreground">
              {card.description}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
