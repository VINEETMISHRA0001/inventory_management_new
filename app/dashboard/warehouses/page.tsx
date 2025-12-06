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
import { SIDEBAR_CONFIG, APP_PATHS, API_ENDPOINTS } from '@/lib/constants';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { fetchUser } from '@/store/slices/authSlice';
import { Plus, Warehouse, MapPin, Phone, Mail } from 'lucide-react';
import type { AppDispatch, RootState } from '@/store/store';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  manager: string;
  isActive: boolean;
}

/**
 * Warehouses page manages multiple warehouse/store locations.
 * Supports creating, viewing, and managing warehouse information.
 */
export default function WarehousesPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const [isMounted, setIsMounted] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Warehouse>>({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    manager: '',
    isActive: true,
  });

  useEffect(() => {
    setIsMounted(true);
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.WAREHOUSES.BASE);
      setWarehouses(response.data.warehouses || []);
    } catch (error: any) {
      console.error('Failed to fetch warehouses:', error);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post(API_ENDPOINTS.WAREHOUSES.BASE, formData);
      toast.success('Warehouse created successfully');
      setSheetOpen(false);
      setFormData({
        name: '',
        code: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        email: '',
        manager: '',
        isActive: true,
      });
      fetchWarehouses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create warehouse');
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
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Warehouses</h1>
                  <p className="text-muted-foreground mt-1">
                    Manage warehouse and store locations
                  </p>
                </div>
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SheetTrigger asChild>
                    <Button>
                      <Plus className="size-4 mr-2" />
                      Add Warehouse
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b">
                      <SheetTitle className="text-2xl">Add New Warehouse</SheetTitle>
                      <SheetDescription className="text-base mt-2">
                        Create a new warehouse or store location for inventory management.
                      </SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleSubmit} className="flex flex-col h-full">
                      <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="name">Warehouse Name *</Label>
                              <Input
                                id="name"
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Main Warehouse"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="code">Warehouse Code *</Label>
                              <Input
                                id="code"
                                value={formData.code || ''}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                placeholder="e.g., WH001"
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="address">Address *</Label>
                            <Input
                              id="address"
                              value={formData.address || ''}
                              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                              placeholder="e.g., 123 Main Street"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="city">City *</Label>
                              <Input
                                id="city"
                                value={formData.city || ''}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                placeholder="e.g., Mumbai"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="state">State *</Label>
                              <Input
                                id="state"
                                value={formData.state || ''}
                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                placeholder="e.g., Maharashtra"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="pincode">Pincode *</Label>
                              <Input
                                id="pincode"
                                value={formData.pincode || ''}
                                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                placeholder="e.g., 400001"
                                required
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="phone">Phone *</Label>
                              <Input
                                id="phone"
                                value={formData.phone || ''}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="e.g., +91 9876543210"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email">Email</Label>
                              <Input
                                id="email"
                                type="email"
                                value={formData.email || ''}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="e.g., warehouse@example.com"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="manager">Manager Name</Label>
                            <Input
                              id="manager"
                              value={formData.manager || ''}
                              onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                              placeholder="e.g., John Doe"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="border-t p-6 flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setSheetOpen(false)} className="flex-1 h-10">
                          Cancel
                        </Button>
                        <Button type="submit" className="flex-1 h-10">
                          Create Warehouse
                        </Button>
                      </div>
                    </form>
                  </SheetContent>
                </Sheet>
              </div>

              {warehouses.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Warehouse className="size-12 text-muted-foreground mb-4" />
                    <CardTitle className="mb-2">No Warehouses</CardTitle>
                    <CardDescription className="mb-4">
                      Get started by creating your first warehouse location.
                    </CardDescription>
                    <Button onClick={() => setSheetOpen(true)}>
                      <Plus className="size-4 mr-2" />
                      Add Warehouse
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {warehouses.map((warehouse) => (
                    <Card key={warehouse.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{warehouse.name}</CardTitle>
                            <CardDescription className="mt-1">{warehouse.code}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="size-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="font-medium">{warehouse.address}</p>
                            <p className="text-muted-foreground">
                              {warehouse.city}, {warehouse.state} - {warehouse.pincode}
                            </p>
                          </div>
                        </div>
                        {warehouse.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="size-4 text-muted-foreground" />
                            <span>{warehouse.phone}</span>
                          </div>
                        )}
                        {warehouse.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="size-4 text-muted-foreground" />
                            <span>{warehouse.email}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

