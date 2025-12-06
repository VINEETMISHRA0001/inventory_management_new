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
import { AlertTriangle, Plus, X } from 'lucide-react';
import type { AppDispatch, RootState } from '@/store/store';
import { useWarehouses } from '@/hooks/use-warehouses';

interface DamageItem {
  productId: string;
  sku: string;
  quantity: number;
  reason: string;
  availableStock?: number;
  productName?: string;
}

/**
 * Stock Damage/Breakage page tracks damaged stock with reason.
 * All damage entries are logged and require admin approval.
 */
export default function StockDamagePage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const [isMounted, setIsMounted] = useState(false);
  const [items, setItems] = useState<DamageItem[]>([
    { productId: '', sku: '', quantity: 0, reason: '', availableStock: undefined },
  ]);
  const { warehouses, isLoading: warehousesLoading } = useWarehouses();
  const [formData, setFormData] = useState({
    warehouseId: '',
    damageDate: new Date().toISOString().split('T')[0],
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
      newItems[index] = { ...newItems[index], availableStock: undefined, productName: undefined, productId: '' };
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
        availableStock: stockData.available || 0,
        productName: stockData.productName || '',
        productId: stockData.productId || '',
      };
      setItems(newItems);
    } catch (error: any) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        availableStock: 0,
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
    setItems([...items, { productId: '', sku: '', quantity: 0, reason: '', availableStock: undefined }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof DamageItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.warehouseId) {
      toast.error('Please select a warehouse');
      return;
    }
    
    if (!formData.damageDate) {
      toast.error('Please select a damage date');
      return;
    }
    
    // Validate items
    const invalidItems = items.filter(item => !item.sku || !item.quantity || item.quantity <= 0 || !item.reason);
    if (invalidItems.length > 0) {
      toast.error('Please fill in all required fields for all products (SKU, Quantity, and Reason)');
      return;
    }
    
    // Check if quantities exceed available stock
    const stockIssues = items.filter(item => 
      item.availableStock !== undefined && item.quantity > item.availableStock
    );
    if (stockIssues.length > 0) {
      toast.error(`Quantity exceeds available stock for some products`);
      return;
    }
    
    try {
      const payload = {
        ...formData,
        items: items.map(item => ({
          sku: item.sku,
          quantity: item.quantity,
          reason: item.reason,
        })),
      };
      
      await apiClient.post(API_ENDPOINTS.STOCK.DAMAGE, payload);
      toast.success('Damage recorded successfully. Stock has been deducted from warehouse.');
      router.push(APP_PATHS.STOCK_DAMAGE_HISTORY);
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || 'Failed to record damage');
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
                  <h1 className="text-3xl font-bold tracking-tight">Record Damaged Stock</h1>
                  <p className="text-muted-foreground mt-1">
                    Record damaged or broken products. Stock will be automatically deducted from warehouse inventory.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push(APP_PATHS.STOCK_DAMAGE_HISTORY)}
                >
                  View History
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Damage Information</CardTitle>
                    <CardDescription>
                      Select the warehouse and date when the damage occurred. Add notes if needed.
                    </CardDescription>
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
                        <Label htmlFor="damageDate">Damage Date *</Label>
                        <DatePicker
                          id="damageDate"
                          value={formData.damageDate}
                          onChange={(date) => setFormData({ ...formData, damageDate: date ? date.toISOString().split('T')[0] : '' })}
                          placeholder="Select damage date"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes about the damage..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Damaged Products</CardTitle>
                        <CardDescription>
                          Enter SKU, quantity damaged, and select the reason. Available stock is shown automatically.
                        </CardDescription>
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
                          <Label>Damaged Quantity *</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            placeholder="e.g., 5"
                            required
                            min={0}
                            max={item.availableStock}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Available Stock</Label>
                          <Input
                            value={item.availableStock !== undefined ? item.availableStock.toString() : '--'}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <div className="col-span-4 space-y-2">
                          <Label>Damage Reason *</Label>
                          <Select
                            value={item.reason}
                            onValueChange={(value) => updateItem(index, 'reason', value)}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="breakage">Breakage</SelectItem>
                              <SelectItem value="water_damage">Water Damage</SelectItem>
                              <SelectItem value="transport">Transport Damage</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
                              <SelectItem value="defective">Defective</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1 flex items-end">
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
                    <AlertTriangle className="size-4 mr-2" />
                    Record Damage
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

