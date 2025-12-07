'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/constants';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import Skeleton from 'react-loading-skeleton';

interface Product {
  id: string;
  sku: string;
  name: string;
  currentStock?: number;
}

interface MovementData {
  date: string;
  stockIn: number;
  stockOut: number;
  netStock: number;
}

interface MovementLog {
  sku: string;
  productName: string;
  currentStock: number;
  movements: MovementData[];
}

export function StockMovementAnalytics() {
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movementLog, setMovementLog] = useState<MovementLog | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingLog, setIsLoadingLog] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [productsPage, setProductsPage] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastProductElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoadingProducts) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreProducts) {
          setProductsPage((prev) => prev + 1);
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isLoadingProducts, hasMoreProducts]
  );

  // Fetch products with search and pagination
  const fetchProducts = useCallback(
    async (search: string, page: number, append: boolean = false) => {
      setIsLoadingProducts(true);
      try {
        const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BASE, {
          params: {
            search,
            page,
            limit: 20,
          },
        });
        const newProducts: Product[] = (response.data.products || []).map((p: any) => ({
          id: p.id || p._id,
          sku: p.sku,
          name: p.name,
          currentStock: p.quantity,
        }));
        if (append) {
          setProducts((prev) => [...prev, ...newProducts]);
        } else {
          setProducts(newProducts);
        }
        setHasMoreProducts(newProducts.length === 20);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setIsLoadingProducts(false);
      }
    },
    []
  );

  // Initial load and debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setProductsPage(1);
      setProducts([]);
      fetchProducts(productSearch, 1, false);
    }, productSearch ? 300 : 0); // No delay for initial load

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productSearch]);

  // Load more products
  useEffect(() => {
    if (productsPage > 1) {
      fetchProducts(productSearch, productsPage, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsPage]);

  // Fetch movement log
  const fetchMovementLog = useCallback(async () => {
    if (!selectedProduct) return;

    setIsLoadingLog(true);
    try {
      const params: any = { sku: selectedProduct.sku };
      
      if (dateMode === 'single' && singleDate) {
        params.date = format(singleDate, 'yyyy-MM-dd');
      } else if (dateMode === 'range' && dateRange.from && dateRange.to) {
        params.startDate = format(dateRange.from, 'yyyy-MM-dd');
        params.endDate = format(dateRange.to, 'yyyy-MM-dd');
      }

      const response = await apiClient.get(API_ENDPOINTS.STOCK.MOVEMENT_LOG, { params });
      setMovementLog(response.data);
    } catch (error: any) {
      if (error.message !== 'Product not found') {
        console.error('Failed to fetch movement log:', error);
      }
      setMovementLog(null);
    } finally {
      setIsLoadingLog(false);
    }
  }, [selectedProduct, dateMode, singleDate, dateRange]);

  // Auto-fetch when product or date changes
  useEffect(() => {
    if (selectedProduct) {
      fetchMovementLog();
    }
  }, [selectedProduct, dateMode, singleDate, dateRange, fetchMovementLog]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yy');
  };

  const chartData = movementLog?.movements
    .map((m) => ({
      date: formatDate(m.date),
      'Stock In': m.stockIn,
      'Stock Out': m.stockOut,
      'Net Stock': m.netStock,
    }))
    .reverse() || [];

  const chartConfig = {
    'Stock In': {
      label: 'Stock In',
      color: 'hsl(var(--chart-1))',
    },
    'Stock Out': {
      label: 'Stock Out',
      color: 'hsl(var(--chart-2))',
    },
    'Net Stock': {
      label: 'Net Stock',
      color: 'hsl(var(--chart-3))',
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column - Date Selector and Products List */}
      <div className="lg:col-span-1 space-y-4">
        {/* Date Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Date Selection</CardTitle>
            <CardDescription>Choose a single date or date range for analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={dateMode} onValueChange={(v) => setDateMode(v as 'single' | 'range')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single">Single Date</TabsTrigger>
                <TabsTrigger value="range">Date Range</TabsTrigger>
              </TabsList>
              <TabsContent value="single" className="mt-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal py-6', !singleDate && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {singleDate ? format(singleDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={singleDate} onSelect={setSingleDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </TabsContent>
              <TabsContent value="range" className="mt-4 space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal py-6', !dateRange.from && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {dateRange.from ? format(dateRange.from, 'PPP') : 'From date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateRange.from} onSelect={(date) => setDateRange({ ...dateRange, from: date })} initialFocus />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal py-6', !dateRange.to && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {dateRange.to ? format(dateRange.to, 'PPP') : 'To date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateRange.to} onSelect={(date) => setDateRange({ ...dateRange, to: date })} initialFocus />
                  </PopoverContent>
                </Popover>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Products List */}
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <CardDescription>Search and select a product to view its stock movement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by SKU or name..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[500px] overflow-y-auto space-y-1">
              {products.map((product, index) => (
                <div
                  key={product.id}
                  ref={index === products.length - 1 ? lastProductElementRef : null}
                  onClick={() => setSelectedProduct(product)}
                  className={cn(
                    'p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent',
                    selectedProduct?.id === product.id && 'bg-accent border-primary'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium font-mono">{product.sku}</div>
                      <div className="text-sm text-muted-foreground">{product.name}</div>
                    </div>
                    {product.currentStock !== undefined && (
                      <Badge variant="outline">{product.currentStock}</Badge>
                    )}
                  </div>
                </div>
              ))}
              {isLoadingProducts && products.length === 0 && (
                <div className="space-y-2 p-3">
                  <Skeleton height={60} count={3} />
                </div>
              )}
              {isLoadingProducts && products.length > 0 && (
                <div className="space-y-2 p-3">
                  <Skeleton height={60} count={2} />
                </div>
              )}
              {!isLoadingProducts && products.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {productSearch ? 'No products found' : 'Start typing to search products'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Analytics Chart */}
      <div className="lg:col-span-2">
        {selectedProduct ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedProduct.sku} = {movementLog?.currentStock ?? '—'}
              </CardTitle>
              <CardDescription>{movementLog?.productName || selectedProduct.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingLog ? (
                <div className="flex items-center justify-center h-[400px]">
                  <Skeleton height={400} width="100%" />
                </div>
              ) : movementLog && movementLog.movements.length > 0 ? (
                <div>
                  <ChartContainer config={chartConfig} className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="fillStockIn" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="hsl(var(--card))" stopOpacity={0.1} />
                          </linearGradient>
                          <linearGradient id="fillStockOut" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="hsl(var(--card))" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tickLine={false} 
                          axisLine={false} 
                          tickMargin={8}
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          tickLine={false} 
                          axisLine={false} 
                          tickMargin={8}
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          className="text-muted-foreground"
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="Stock In"
                          stroke="hsl(var(--chart-1))"
                          fill="url(#fillStockIn)"
                          stackId="1"
                        />
                        <Area
                          type="monotone"
                          dataKey="Stock Out"
                          stroke="hsl(var(--chart-2))"
                          fill="url(#fillStockOut)"
                          stackId="1"
                        />
                        <Line
                          type="monotone"
                          dataKey="Net Stock"
                          stroke="hsl(var(--chart-3))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No movement data found for the selected date range
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-[400px]">
              <div className="text-center text-muted-foreground">
                <p className="text-lg font-medium mb-2">Select a product</p>
                <p className="text-sm">Choose a product from the list to view stock movement analytics</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

