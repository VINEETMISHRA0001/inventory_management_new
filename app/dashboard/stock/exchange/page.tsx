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
import { RefreshCw, Plus, X } from 'lucide-react';
import type { AppDispatch, RootState } from '@/store/store';
import { useWarehouses } from '@/hooks/use-warehouses';

interface ExchangeItem {
  fromProductId: string;
  fromSku: string;
  fromQuantity: number;
  toProductId: string;
  toSku: string;
  toQuantity: number;
  reason: string;
}

/**
 * Stock Exchange page handles swapping product sizes/variants and adjusting stock accordingly.
 * All exchanges are logged and reversible via admin approval.
 */
export default function StockExchangePage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const [isMounted, setIsMounted] = useState(false);
  const [items, setItems] = useState<ExchangeItem[]>([
    { fromProductId: '', fromSku: '', fromQuantity: 0, toProductId: '', toSku: '', toQuantity: 0, reason: '' },
  ]);
  const { warehouses, isLoading: warehousesLoading } = useWarehouses();
  const [formData, setFormData] = useState({
    warehouseId: '',
    exchangeDate: new Date().toISOString().split('T')[0],
    orderReference: '',
    customerName: '',
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
    setItems([...items, { fromProductId: '', fromSku: '', fromQuantity: 0, toProductId: '', toSku: '', toQuantity: 0, reason: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ExchangeItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post(API_ENDPOINTS.STOCK.EXCHANGE, { ...formData, items });
      toast.success('Exchange processed successfully');
      router.push(APP_PATHS.STOCK_MANAGEMENT);
    } catch (error: any) {
      toast.error(error.message || 'Failed to process exchange');
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
                  <h1 className="text-3xl font-bold tracking-tight">Stock Exchange</h1>
                  <p className="text-muted-foreground mt-1">
                    Swap product sizes/variants and adjust stock accordingly
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push(APP_PATHS.STOCK_EXCHANGE_HISTORY)}
                >
                  View History
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Exchange Information</CardTitle>
                    <CardDescription>Enter details about the product exchange</CardDescription>
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
                        <Label htmlFor="exchangeDate">Exchange Date *</Label>
                        <DatePicker
                          id="exchangeDate"
                          value={formData.exchangeDate}
                          onChange={(date) => setFormData({ ...formData, exchangeDate: date ? date.toISOString().split('T')[0] : '' })}
                          placeholder="Select exchange date"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="orderReference">Order Reference</Label>
                        <Input
                          id="orderReference"
                          value={formData.orderReference}
                          onChange={(e) => setFormData({ ...formData, orderReference: e.target.value })}
                          placeholder="e.g., ORD-2024-001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customerName">Customer Name</Label>
                        <Input
                          id="customerName"
                          value={formData.customerName}
                          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                          placeholder="e.g., John Doe"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes about the exchange..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Product Exchange</CardTitle>
                        <CardDescription>Swap products and adjust quantities</CardDescription>
                      </div>
                      <Button type="button" onClick={addItem} variant="outline">
                        <Plus className="size-4 mr-2" />
                        Add Exchange
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>From Product (SKU) *</Label>
                            <Input
                              value={item.fromSku}
                              onChange={(e) => updateItem(index, 'fromSku', e.target.value)}
                              placeholder="e.g., S2020181FG"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>From Quantity *</Label>
                            <Input
                              type="number"
                              value={item.fromQuantity}
                              onChange={(e) => updateItem(index, 'fromQuantity', parseFloat(e.target.value) || 0)}
                              placeholder="e.g., 1"
                              required
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-center">
                          <RefreshCw className="size-5 text-muted-foreground" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>To Product (SKU) *</Label>
                            <Input
                              value={item.toSku}
                              onChange={(e) => updateItem(index, 'toSku', e.target.value)}
                              placeholder="e.g., S2020182FG"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>To Quantity *</Label>
                            <Input
                              type="number"
                              value={item.toQuantity}
                              onChange={(e) => updateItem(index, 'toQuantity', parseFloat(e.target.value) || 0)}
                              placeholder="e.g., 1"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Exchange Reason *</Label>
                          <Select
                            value={item.reason}
                            onValueChange={(value) => updateItem(index, 'reason', value)}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="size_change">Size Change</SelectItem>
                              <SelectItem value="variant_change">Variant Change</SelectItem>
                              <SelectItem value="color_change">Color Change</SelectItem>
                              <SelectItem value="customer_preference">Customer Preference</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {items.length > 1 && (
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(index)}
                              className="size-10"
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => router.back()} className="h-10">
                    Cancel
                  </Button>
                  <Button type="submit" className="h-10">
                    <RefreshCw className="size-4 mr-2" />
                    Process Exchange
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

