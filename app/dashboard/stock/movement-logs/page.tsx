'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Search, CalendarIcon, Package, ImageIcon, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/dashboard-layout/dashboard-layout';
import { APP_PATHS, API_ENDPOINTS } from '@/lib/constants';
import { apiClient } from '@/lib/api-client';
import { TableSkeleton } from '@/components/skeletons/table-skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface MovementData {
  date: string;
  stockIn: number;
  stockOut: number;
  netStock: number;
  operationId?: string;
  timestamp?: string;
}

interface MovementLog {
  sku: string;
  productName: string;
  currentStock: number;
  movements: MovementData[];
}

interface Product {
  id: string;
  sku: string;
  name: string;
  productType?: string;
}

export default function StockMovementLogsPage() {
  const router = useRouter();
  const [skuSearch, setSkuSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movementLog, setMovementLog] = useState<MovementLog | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  // Search dropdown state
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [productsPage, setProductsPage] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastProductElementRef = useCallback(
    (node: HTMLLIElement | null) => {
      if (isLoadingSuggestions) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreProducts) {
          setProductsPage((prev) => prev + 1);
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isLoadingSuggestions, hasMoreProducts]
  );
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Fetch products with search and pagination
  const fetchProducts = useCallback(
    async (search: string, page: number, append: boolean = false) => {
      if (!search || search.length < 2) {
        if (!append) {
          setSuggestions([]);
          setIsDropdownOpen(false);
        }
        return;
      }

      setIsLoadingSuggestions(true);
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
          productType: p.productType,
        }));
        
        if (append) {
          setSuggestions((prev) => [...prev, ...newProducts]);
        } else {
          setSuggestions(newProducts);
        }
        setHasMoreProducts(newProducts.length === 20);
        if (newProducts.length > 0 && !append) {
          setIsDropdownOpen(true);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
        if (!append) {
          setSuggestions([]);
        }
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    []
  );

  // Debounced search effect
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setProductsPage(1);
      setSuggestions([]);
      fetchProducts(skuSearch, 1, false);
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [skuSearch, fetchProducts]);

  // Load more products when page changes
  useEffect(() => {
    if (productsPage > 1 && skuSearch.length >= 2) {
      fetchProducts(skuSearch, productsPage, true);
    }
  }, [productsPage, skuSearch, fetchProducts]);

  const fetchMovementLog = async (sku: string) => {
    if (!sku.trim()) {
      setMovementLog(null);
      return;
    }

    setIsLoading(true);
    try {
      const params: any = { sku: sku.trim() };
      
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
      setIsLoading(false);
    }
  };

  // Auto-fetch movement log when product is selected or date changes
  useEffect(() => {
    if (selectedProduct) {
      fetchMovementLog(selectedProduct.sku);
    }
  }, [selectedProduct, dateMode, singleDate, dateRange]);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setSkuSearch(product.sku);
    setIsDropdownOpen(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleSearchChange = (value: string) => {
    setSkuSearch(value);
    setSelectedProduct(null);
    setSelectedIndex(-1);
    if (value.length >= 2) {
      setIsDropdownOpen(true);
    } else {
      setIsDropdownOpen(false);
      setSuggestions([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || suggestions.length === 0) {
      if (e.key === 'Enter' && skuSearch.trim()) {
        e.preventDefault();
        fetchMovementLog(skuSearch.trim());
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleProductSelect(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsDropdownOpen(false);
    }, 200);
  };

  const formatDateIST = (timestamp?: string, dateString?: string) => {
    try {
      const date = timestamp ? new Date(timestamp) : dateString ? new Date(dateString) : null;
      if (!date) return '—';
      
      // Format date in IST
      const istDate = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
      
      return istDate;
    } catch {
      return '—';
    }
  };

  const formatTimestampIST = (timestamp?: string, dateString?: string) => {
    try {
      const date = timestamp ? new Date(timestamp) : dateString ? new Date(dateString) : null;
      if (!date) return '—';
      
      // Format timestamp in IST with AM/PM
      const istTime = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(date);
      
      return istTime;
    } catch {
      return '—';
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(APP_PATHS.STOCK_MANAGEMENT)}
            className="h-9 w-9"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Stock Movement Logs</h1>
            <p className="text-muted-foreground mt-1">
              Track detailed stock movements with inventory history
            </p>
          </div>
        </div>

        {/* Search and Date Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Search Product</CardTitle>
            <CardDescription>Enter SKU and select date range to view movement history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
              {/* SKU Search with Dropdown */}
              <div className="flex-1 lg:max-w-xs space-y-2">
                <div className="relative" ref={dropdownRef}>
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground z-10" />
                  <Input
                    ref={inputRef}
                    placeholder="Search by SKU or name..."
                    value={skuSearch}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => {
                      if (suggestions.length > 0) {
                        setIsDropdownOpen(true);
                      }
                    }}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="pl-9"
                  />
                  {isDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md">
                      <div className="max-h-60 overflow-auto">
                        {isLoadingSuggestions && suggestions.length === 0 ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : suggestions.length > 0 ? (
                          <ul className="py-1">
                            {suggestions.map((product, index) => (
                              <li
                                key={product.id}
                                ref={index === suggestions.length - 1 ? lastProductElementRef : null}
                                className={cn(
                                  'cursor-pointer px-4 py-2 text-sm hover:bg-accent transition-colors',
                                  selectedIndex === index && 'bg-accent'
                                )}
                                onClick={() => handleProductSelect(product)}
                                onMouseEnter={() => setSelectedIndex(index)}
                              >
                                <div className="font-medium font-mono">{product.sku}</div>
                                <div className="text-xs text-muted-foreground">
                                  {product.name}
                                  {product.productType && ` • ${product.productType}`}
                                </div>
                              </li>
                            ))}
                            {isLoadingSuggestions && suggestions.length > 0 && (
                              <li className="flex items-center justify-center p-2">
                                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                              </li>
                            )}
                            {!hasMoreProducts && suggestions.length > 0 && (
                              <li className="px-4 py-2 text-xs text-muted-foreground text-center">
                                No more products
                              </li>
                            )}
                          </ul>
                        ) : (
                          <div className="px-4 py-2 text-sm text-muted-foreground">
                            {skuSearch.length < 2 ? 'Type at least 2 characters' : 'No products found'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Date Selection */}
              <div className="flex-1 lg:flex-[2]">
                <Tabs value={dateMode} onValueChange={(v) => setDateMode(v as 'single' | 'range')}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <TabsList className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 w-auto shrink-0">
                      <TabsTrigger value="single" className="px-3 py-1.5 text-sm whitespace-nowrap">Single Date</TabsTrigger>
                      <TabsTrigger value="range" className="px-3 py-1.5 text-sm whitespace-nowrap">Date Range</TabsTrigger>
                    </TabsList>
                    <div className="flex-1 w-full sm:w-auto min-w-0">
                      <TabsContent value="single" className="mt-0">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn('w-full sm:w-auto sm:min-w-[200px] justify-start text-left font-normal', !singleDate && 'text-muted-foreground')}
                            >
                              <CalendarIcon className="mr-2 size-4" />
                              {singleDate ? format(singleDate, 'PPP') : 'Pick a date (optional)'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={singleDate} onSelect={setSingleDate} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </TabsContent>
                      <TabsContent value="range" className="mt-0">
                        <div className="flex gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn('flex-1 sm:flex-initial sm:min-w-[150px] justify-start text-left font-normal', !dateRange.from && 'text-muted-foreground')}
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
                                className={cn('flex-1 sm:flex-initial sm:min-w-[150px] justify-start text-left font-normal', !dateRange.to && 'text-muted-foreground')}
                              >
                                <CalendarIcon className="mr-2 size-4" />
                                {dateRange.to ? format(dateRange.to, 'PPP') : 'To date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={dateRange.to} onSelect={(date) => setDateRange({ ...dateRange, to: date })} initialFocus />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TabsContent>
                    </div>
                  </div>
                </Tabs>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Movement Log Table */}
        {movementLog && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {movementLog.sku} = {movementLog.currentStock}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {movementLog.productName}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-sm">
                  Current Stock: {movementLog.currentStock}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <TableSkeleton rows={10} columns={5} columnWidths={[80, 150, 120, 120, 120]} />
              ) : movementLog.movements.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Image</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead className="text-right">Stock In</TableHead>
                        <TableHead className="text-right">Stock Out</TableHead>
                        <TableHead className="text-right">Net Stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movementLog.movements.map((movement, index) => (
                        <TableRow key={movement.operationId || `${movement.date}-${movement.timestamp || index}-${index}`}>
                          <TableCell>
                            <div className="flex items-center justify-center w-12 h-12 bg-muted rounded border">
                              <ImageIcon className="size-5 text-muted-foreground" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {formatDateIST(movement.timestamp, movement.date)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatTimestampIST(movement.timestamp, movement.date)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {movement.stockIn > 0 ? (
                              <span className="text-green-600 font-medium">
                                +{movement.stockIn}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {movement.stockOut > 0 ? (
                              <span className="text-red-600 font-medium">
                                -{movement.stockOut}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {movement.netStock}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="size-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No movement data found</p>
                  <p className="text-sm">Try adjusting your date range or search for a different SKU</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!movementLog && !isLoading && selectedProduct && (
          <Card className="border-2">
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="p-4 rounded-full bg-destructive/10 dark:bg-destructive/20 inline-block mb-4">
                  <Search className="size-8 text-destructive" />
                </div>
                <p className="text-xl font-semibold mb-2">No movement data found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your date range or select a different product</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!movementLog && !isLoading && !selectedProduct && (
          <Card className="border-2 border-dashed">
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center text-muted-foreground">
                <p className="text-lg font-medium mb-2">Search for a product</p>
                <p className="text-sm">Search by SKU or product name above to view detailed stock movement logs</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

