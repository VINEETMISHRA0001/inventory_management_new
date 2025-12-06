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
import { ArrowDownCircle, Plus, X } from 'lucide-react';
import type { AppDispatch, RootState } from '@/store/store';
import { useWarehouses } from '@/hooks/use-warehouses';

interface StockInItem {
  productId: string;
  sku: string;
  quantity: number;
  batch?: string;
  expiryDate?: string;
  currentStock?: number;
  productName?: string;
}

/**
 * Stock In (GRN) page handles adding stock after purchase order arrival.
 * Supports supplier reference, batch tracking, and multiple products.
 */
export default function StockInPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const [isMounted, setIsMounted] = useState(false);
  const [items, setItems] = useState<StockInItem[]>([
    { productId: '', sku: '', quantity: 0, currentStock: undefined },
  ]);
  const { warehouses, isLoading: warehousesLoading } = useWarehouses();
  const [formData, setFormData] = useState({
    warehouseId: '',
    supplierReference: '',
    purchaseOrderNumber: '',
    receivedDate: new Date().toISOString().split('T')[0],
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
      newItems[index] = { ...newItems[index], currentStock: undefined, productName: undefined, productId: '' };
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
        currentStock: stockData.quantity || 0,
        productName: stockData.productName || '',
        productId: stockData.productId || '',
      };
      setItems(newItems);
    } catch (error: any) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        currentStock: 0,
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
    setItems([...items, { productId: '', sku: '', quantity: 0, currentStock: undefined }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof StockInItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post(API_ENDPOINTS.STOCK.IN, { ...formData, items });
      toast.success('Stock received successfully');
      router.push(APP_PATHS.STOCK_MANAGEMENT);
    } catch (error: any) {
      toast.error(error.message || 'Failed to receive stock');
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
                  <h1 className="text-3xl font-bold tracking-tight">Stock In (GRN)</h1>
                  <p className="text-muted-foreground mt-1">
                    Add stock after purchase order arrival with supplier reference
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push(APP_PATHS.STOCK_IN_HISTORY)}
                >
                  View History
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Receipt Information</CardTitle>
                    <CardDescription>Enter details about the stock receipt</CardDescription>
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
                        <Label htmlFor="receivedDate">Received Date *</Label>
                        <DatePicker
                          id="receivedDate"
                          value={formData.receivedDate}
                          onChange={(date) => setFormData({ ...formData, receivedDate: date ? date.toISOString().split('T')[0] : '' })}
                          placeholder="Select received date"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="supplierReference">Supplier Reference *</Label>
                        <Input
                          id="supplierReference"
                          value={formData.supplierReference}
                          onChange={(e) => setFormData({ ...formData, supplierReference: e.target.value })}
                          placeholder="e.g., SUP001"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="purchaseOrderNumber">Purchase Order Number</Label>
                        <Input
                          id="purchaseOrderNumber"
                          value={formData.purchaseOrderNumber}
                          onChange={(e) => setFormData({ ...formData, purchaseOrderNumber: e.target.value })}
                          placeholder="e.g., PO-2024-001"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes about this stock receipt..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Products</CardTitle>
                        <CardDescription>Add products received in this shipment</CardDescription>
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
                            placeholder="e.g., 100"
                            required
                            min={0}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Current Stock</Label>
                          <Input
                            value={item.currentStock !== undefined ? item.currentStock.toString() : '--'}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <div className="col-span-3 space-y-2">
                          <Label>Batch / Lot</Label>
                          <Input
                            value={item.batch || ''}
                            onChange={(e) => updateItem(index, 'batch', e.target.value)}
                            placeholder="e.g., BATCH001"
                          />
                        </div>
                        <div className="col-span-2 flex items-end">
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
                    <ArrowDownCircle className="size-4 mr-2" />
                    Receive Stock
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

