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
import { ArrowLeftRight, Plus, X } from 'lucide-react';
import type { AppDispatch, RootState } from '@/store/store';
import { useWarehouses } from '@/hooks/use-warehouses';
import { SkuAutocomplete } from '@/components/sku-autocomplete';

interface TransferItem {
  productId: string;
  sku: string;
  quantity: number;
  availableStock?: number;
}

/**
 * Stock Transfer page handles transferring stock between warehouse/store locations.
 * All transfers are logged and reversible via admin approval.
 */
export default function StockTransferPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const [isMounted, setIsMounted] = useState(false);
  const [items, setItems] = useState<TransferItem[]>([
    { productId: '', sku: '', quantity: 0, availableStock: undefined },
  ]);
  const { warehouses, isLoading: warehousesLoading } = useWarehouses();
  const [formData, setFormData] = useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    transferDate: new Date().toISOString().split('T')[0],
    reason: '',
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

  if (!isMounted || isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const addItem = () => {
    setItems([...items, { productId: '', sku: '', quantity: 0, availableStock: undefined }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof TransferItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSkuChange = async (index: number, sku: string, product?: { id: string; sku: string; name: string; quantity: number }) => {
    const newItems = [...items];
    if (product && formData.fromWarehouseId) {
      // Fetch warehouse-specific stock
      try {
        const response = await apiClient.get(
          `/api/stock/warehouse-stock?sku=${encodeURIComponent(sku)}&warehouseId=${formData.fromWarehouseId}`
        );
        const stockData = response.data;
        newItems[index] = {
          ...newItems[index],
          sku: product.sku,
          productId: product.id,
          availableStock: stockData.available || 0,
        };
      } catch (error) {
        newItems[index] = {
          ...newItems[index],
          sku: product.sku,
          productId: product.id,
          availableStock: product.quantity || 0,
        };
      }
    } else {
      newItems[index] = {
        ...newItems[index],
        sku,
        productId: '',
        availableStock: undefined,
      };
    }
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post(API_ENDPOINTS.STOCK.TRANSFER, { ...formData, items });
      toast.success('Stock transfer request created successfully');
      router.push(APP_PATHS.STOCK_MANAGEMENT);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create transfer request');
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
                  <h1 className="text-3xl font-bold tracking-tight">Stock Transfer</h1>
                  <p className="text-muted-foreground mt-1">
                    Transfer stock between warehouse/store locations
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push(APP_PATHS.STOCK_TRANSFER_HISTORY)}
                >
                  View History
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Transfer Information</CardTitle>
                    <CardDescription>Enter transfer details between warehouses</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fromWarehouseId">From Warehouse *</Label>
                        <Select
                          value={formData.fromWarehouseId}
                          onValueChange={(value) => setFormData({ ...formData, fromWarehouseId: value })}
                          required
                          disabled={warehousesLoading}
                        >
                          <SelectTrigger id="fromWarehouseId">
                            <SelectValue placeholder={warehousesLoading ? "Loading warehouses..." : "Select source warehouse"} />
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
                        <Label htmlFor="toWarehouseId">To Warehouse *</Label>
                        <Select
                          value={formData.toWarehouseId}
                          onValueChange={(value) => setFormData({ ...formData, toWarehouseId: value })}
                          required
                          disabled={warehousesLoading}
                        >
                          <SelectTrigger id="toWarehouseId">
                            <SelectValue placeholder={warehousesLoading ? "Loading warehouses..." : "Select destination warehouse"} />
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
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="transferDate">Transfer Date *</Label>
                        <DatePicker
                          id="transferDate"
                          value={formData.transferDate}
                          onChange={(date) => setFormData({ ...formData, transferDate: date ? date.toISOString().split('T')[0] : '' })}
                          placeholder="Select transfer date"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reason">Reason *</Label>
                        <Select
                          value={formData.reason}
                          onValueChange={(value) => setFormData({ ...formData, reason: value })}
                          required
                        >
                          <SelectTrigger id="reason">
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="restock">Restock</SelectItem>
                            <SelectItem value="redistribution">Redistribution</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes about this transfer..."
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
                        <CardDescription>Add products to transfer</CardDescription>
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
                        <div className="col-span-4 space-y-2">
                          <Label>SKU / Product Code *</Label>
                          <SkuAutocomplete
                            value={item.sku}
                            onChange={(sku, product) => handleSkuChange(index, sku, product)}
                            placeholder="e.g., S2020181FG"
                            required
                          />
                        </div>
                        <div className="col-span-3 space-y-2">
                          <Label>Quantity *</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            placeholder="e.g., 50"
                            required
                          />
                        </div>
                        <div className="col-span-5 space-y-2">
                          <Label>Available Stock</Label>
                          <Input
                            value={item.availableStock !== undefined ? item.availableStock.toString() : '--'}
                            disabled
                            className="bg-muted"
                          />
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
                    <ArrowLeftRight className="size-4 mr-2" />
                    Transfer Stock
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

