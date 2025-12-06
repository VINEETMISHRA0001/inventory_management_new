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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SIDEBAR_CONFIG, APP_PATHS, API_ENDPOINTS } from '@/lib/constants';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { fetchUser } from '@/store/slices/authSlice';
import { Edit, Plus, X } from 'lucide-react';
import type { AppDispatch, RootState } from '@/store/store';
import { useWarehouses } from '@/hooks/use-warehouses';

interface AdjustmentItem {
  productId: string;
  sku: string;
  currentQuantity: number;
  adjustedQuantity: number;
  reason: string;
  productName?: string;
}

/**
 * Stock Adjustment page allows manual correction with approval and logs.
 * All adjustments require admin approval and are fully logged.
 */
export default function StockAdjustmentPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const [isMounted, setIsMounted] = useState(false);
  const [items, setItems] = useState<AdjustmentItem[]>([
    { productId: '', sku: '', currentQuantity: 0, adjustedQuantity: 0, reason: '' },
  ]);
  const { warehouses, isLoading: warehousesLoading } = useWarehouses();
  const [formData, setFormData] = useState({
    warehouseId: '',
    adjustmentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  const fetchStockForItem = async (index: number, sku: string) => {
    if (!sku || !formData.warehouseId) {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], currentQuantity: 0, productName: undefined, productId: '' };
      setItems(newItems);
      return;
    }

    try {
      const response = await apiClient.get(
        `/api/stock/warehouse-stock?sku=${encodeURIComponent(sku)}&warehouseId=${formData.warehouseId}`
      );
      const stockData = response.data;
      
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        currentQuantity: stockData.quantity || 0,
        adjustedQuantity: stockData.quantity || 0,
        productName: stockData.productName || '',
        productId: stockData.productId || '',
      };
      setItems(newItems);
    } catch (error: any) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        currentQuantity: 0,
        adjustedQuantity: 0,
        productName: undefined,
        productId: '',
      };
      setItems(newItems);
    }
  };

  // Debounced SKU lookup - must be before early return
  useEffect(() => {
    if (!formData.warehouseId) return;
    
    const timeouts: NodeJS.Timeout[] = [];
    
    items.forEach((item, index) => {
      if (item.sku) {
        const timeout = setTimeout(() => {
          fetchStockForItem(index, item.sku);
        }, 500);
        timeouts.push(timeout);
      }
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
    // Only depend on SKU values and warehouse, not entire items array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map(i => i.sku).join(','), formData.warehouseId]);

  if (!isMounted || isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const addItem = () => {
    setItems([...items, { productId: '', sku: '', currentQuantity: 0, adjustedQuantity: 0, reason: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof AdjustmentItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post(API_ENDPOINTS.STOCK.ADJUSTMENT, { ...formData, items });
      toast.success('Adjustment request created successfully, pending approval');
      router.push(APP_PATHS.STOCK_MANAGEMENT);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create adjustment request');
    }
  };

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
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Stock Adjustment</h1>
                  <p className="text-muted-foreground mt-1">
                    Manual correction with approval and logs
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push(APP_PATHS.STOCK_ADJUSTMENT_HISTORY)}
                >
                  View History
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Adjustment Information</CardTitle>
                    <CardDescription>Enter details about the stock adjustment</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="warehouseId">Warehouse *</Label>
                        <Select
                          value={formData.warehouseId}
                          onValueChange={(value) => setFormData({ ...formData, warehouseId: value })}
                          required
                          disabled={warehousesLoading}
                        >
                          <SelectTrigger id="warehouseId">
                            <SelectValue placeholder={warehousesLoading ? "Loading warehouses..." : "Select warehouse"} />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.map((warehouse) => (
                              <SelectItem key={warehouse.id} value={warehouse.id}>
                                {warehouse.name} ({warehouse.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="adjustmentDate">Adjustment Date *</Label>
                        <DatePicker
                          id="adjustmentDate"
                          value={formData.adjustmentDate}
                          onChange={(date) => setFormData({ ...formData, adjustmentDate: date ? date.toISOString().split('T')[0] : '' })}
                          placeholder="Select adjustment date"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Reason for Adjustment *</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Explain the reason for this adjustment..."
                        rows={3}
                        required
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Products</CardTitle>
                        <CardDescription>Adjust quantities for products</CardDescription>
                      </div>
                      <Button type="button" onClick={addItem} variant="outline">
                        <Plus className="size-4 mr-2" />
                        Add Product
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-4 p-4 border rounded-lg">
                        <div className="col-span-3 space-y-2">
                          <Label>SKU / Product Code *</Label>
                          <Input
                            value={item.sku}
                            onChange={(e) => updateItem(index, 'sku', e.target.value)}
                            placeholder="e.g., S2020181FG"
                            required
                          />
                          {item.productName && (
                            <p className="text-xs text-muted-foreground mt-1">{item.productName}</p>
                          )}
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Current Qty</Label>
                          <Input
                            type="number"
                            value={item.currentQuantity}
                            onChange={(e) => updateItem(index, 'currentQuantity', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Adjusted Qty *</Label>
                          <Input
                            type="number"
                            value={item.adjustedQuantity}
                            onChange={(e) => updateItem(index, 'adjustedQuantity', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            required
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Difference</Label>
                          <Input
                            value={item.adjustedQuantity - item.currentQuantity}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <div className="col-span-3 space-y-2">
                          <Label>Reason *</Label>
                          <Select
                            value={item.reason}
                            onValueChange={(value) => updateItem(index, 'reason', value)}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="count_error">Count Error</SelectItem>
                              <SelectItem value="theft">Theft</SelectItem>
                              <SelectItem value="found">Found Stock</SelectItem>
                              <SelectItem value="system_correction">System Correction</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-12 flex justify-end">
                          {items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(index)}
                              className="size-10"
                            >
                              <X className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => router.back()} className="h-10">
                    Cancel
                  </Button>
                  <Button type="submit" className="h-10">
                    <Edit className="size-4 mr-2" />
                    Submit for Approval
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

