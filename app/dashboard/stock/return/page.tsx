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
import { RotateCcw, Plus, X } from 'lucide-react';
import type { AppDispatch, RootState } from '@/store/store';
import { useWarehouses } from '@/hooks/use-warehouses';

interface ReturnItem {
  productId: string;
  sku: string;
  quantity: number;
  condition: string;
  availableStock?: number;
  productName?: string;
}

/**
 * Customer Return page handles returned products that go to return QC bucket.
 * All returns are logged and require quality check before restocking.
 */
export default function StockReturnPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const [isMounted, setIsMounted] = useState(false);
  const [items, setItems] = useState<ReturnItem[]>([
    { productId: '', sku: '', quantity: 0, condition: '', availableStock: undefined },
  ]);
  const { warehouses, isLoading: warehousesLoading } = useWarehouses();
  const [formData, setFormData] = useState({
    warehouseId: '',
    returnDate: new Date().toISOString().split('T')[0],
    orderReference: '',
    customerName: '',
    returnReason: '',
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
    setItems([...items, { productId: '', sku: '', quantity: 0, condition: '', availableStock: undefined }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ReturnItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post(API_ENDPOINTS.STOCK.RETURN, { ...formData, items });
      toast.success('Return recorded successfully, pending QC');
      router.push(APP_PATHS.STOCK_MANAGEMENT);
    } catch (error: any) {
      toast.error(error.message || 'Failed to process return');
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
                  <h1 className="text-3xl font-bold tracking-tight">Customer Return</h1>
                  <p className="text-muted-foreground mt-1">
                    Returned products go to return QC bucket for quality check
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push(APP_PATHS.STOCK_RETURN_HISTORY)}
                >
                  View History
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Return Information</CardTitle>
                    <CardDescription>Enter details about the customer return</CardDescription>
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
                        <Label htmlFor="returnDate">Return Date *</Label>
                        <DatePicker
                          id="returnDate"
                          value={formData.returnDate}
                          onChange={(date) => setFormData({ ...formData, returnDate: date ? date.toISOString().split('T')[0] : '' })}
                          placeholder="Select return date"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="orderReference">Order Reference *</Label>
                        <Input
                          id="orderReference"
                          value={formData.orderReference}
                          onChange={(e) => setFormData({ ...formData, orderReference: e.target.value })}
                          placeholder="e.g., ORD-2024-001"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customerName">Customer Name *</Label>
                        <Input
                          id="customerName"
                          value={formData.customerName}
                          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                          placeholder="e.g., John Doe"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="returnReason">Return Reason *</Label>
                      <Select
                        value={formData.returnReason}
                        onValueChange={(value) => setFormData({ ...formData, returnReason: value })}
                        required
                      >
                        <SelectTrigger id="returnReason">
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="defective">Defective Product</SelectItem>
                          <SelectItem value="wrong_item">Wrong Item</SelectItem>
                          <SelectItem value="damaged">Damaged in Transit</SelectItem>
                          <SelectItem value="not_as_described">Not as Described</SelectItem>
                          <SelectItem value="customer_request">Customer Request</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes about the return..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Returned Products</CardTitle>
                        <CardDescription>Add returned products with condition</CardDescription>
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
                          <Label>Quantity *</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            placeholder="e.g., 1"
                            required
                            min={0}
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
                          <Label>Condition *</Label>
                          <Select
                            value={item.condition}
                            onValueChange={(value) => updateItem(index, 'condition', value)}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New / Unopened</SelectItem>
                              <SelectItem value="opened">Opened / Used</SelectItem>
                              <SelectItem value="damaged">Damaged</SelectItem>
                              <SelectItem value="defective">Defective</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3 flex items-end">
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
                    <RotateCcw className="size-4 mr-2" />
                    Process Return
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

