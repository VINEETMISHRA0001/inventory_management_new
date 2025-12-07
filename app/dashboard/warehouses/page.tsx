"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import Image from "next/image";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SIDEBAR_CONFIG, APP_PATHS, API_ENDPOINTS } from "@/lib/constants";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { fetchUser } from "@/store/slices/authSlice";
import {
  Plus,
  Warehouse,
  MapPin,
  Phone,
  Mail,
  Edit2,
  Trash2,
  X,
  ArrowUpRight,
} from "lucide-react";
import type { AppDispatch, RootState } from "@/store/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const { isAuthenticated, isLoading } = useSelector(
    (state: RootState) => state.auth
  );
  const [isMounted, setIsMounted] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(
    null
  );
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(
    null
  );
  const [formData, setFormData] = useState<Partial<Warehouse>>({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    manager: "",
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
      console.error("Failed to fetch warehouses:", error);
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

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
      email: "",
      manager: "",
      isActive: true,
    });
    setEditingWarehouse(null);
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address,
      city: warehouse.city,
      state: warehouse.state,
      pincode: warehouse.pincode,
      phone: warehouse.phone,
      email: warehouse.email,
      manager: warehouse.manager,
      isActive: warehouse.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWarehouse) {
        await apiClient.put(
          API_ENDPOINTS.WAREHOUSES.BY_ID(editingWarehouse.id),
          formData
        );
        toast.success("Warehouse updated successfully");
      } else {
        await apiClient.post(API_ENDPOINTS.WAREHOUSES.BASE, formData);
        toast.success("Warehouse created successfully");
      }
      setDialogOpen(false);
      resetForm();
      fetchWarehouses();
    } catch (error: any) {
      toast.error(
        error.message ||
          `Failed to ${editingWarehouse ? "update" : "create"} warehouse`
      );
    }
  };

  const handleDeleteClick = (warehouse: Warehouse) => {
    setWarehouseToDelete(warehouse);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!warehouseToDelete) return;

    try {
      await apiClient.delete(
        API_ENDPOINTS.WAREHOUSES.BY_ID(warehouseToDelete.id)
      );
      toast.success("Warehouse deleted successfully");
      setDeleteDialogOpen(false);
      setWarehouseToDelete(null);
      fetchWarehouses();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete warehouse");
    }
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": SIDEBAR_CONFIG.WIDTH,
          "--header-height": SIDEBAR_CONFIG.HEADER_HEIGHT,
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
                  <h1 className="text-3xl font-bold tracking-tight">
                    Warehouses
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Manage warehouse and store locations
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Add Warehouse Card */}
                <Card
                  className="border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer group relative overflow-hidden"
                  onClick={handleOpenAddDialog}
                >
                  <CardContent className="flex flex-col items-center justify-center py-12 min-h-[280px]">
                    <div className="relative w-24 h-24 mb-4">
                      <Image
                        src="/assets/storage-stacks.png"
                        alt="Add Warehouse"
                        fill
                        className="object-contain opacity-60 group-hover:opacity-80 transition-opacity"
                      />
                    </div>
                    <CardTitle className="text-lg mb-2 text-center">
                      Add a New Warehouse
                    </CardTitle>
                    <div className="absolute top-4 right-4">
                      <div className="p-2 rounded-full border-2 border-dashed border-muted-foreground/40 group-hover:border-primary/60 transition-all group-hover:translate-x-1 group-hover:-translate-y-1">
                        <ArrowUpRight className="size-5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Existing Warehouses */}
                {warehouses.map((warehouse) => (
                  <Card
                    key={warehouse.id}
                    className="hover:shadow-lg transition-shadow relative group"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {warehouse.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {warehouse.code}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditDialog(warehouse);
                            }}
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(warehouse);
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="size-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">{warehouse.address}</p>
                          <p className="text-muted-foreground">
                            {warehouse.city}, {warehouse.state} -{" "}
                            {warehouse.pincode}
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

              {/* Add/Edit Warehouse Dialog */}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">
                      {editingWarehouse
                        ? "Edit Warehouse"
                        : "Add a New Warehouse"}
                    </DialogTitle>
                    <DialogDescription className="text-base mt-2">
                      {editingWarehouse
                        ? "Update warehouse information below."
                        : "Create a new Warehouse for your business"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Warehouse Name *</Label>
                          <Input
                            id="name"
                            value={formData.name || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            placeholder="e.g., Main Warehouse"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="code">Warehouse Code *</Label>
                          <Input
                            id="code"
                            value={formData.code || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, code: e.target.value })
                            }
                            placeholder="e.g., WH001"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Address *</Label>
                        <Input
                          id="address"
                          value={formData.address || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              address: e.target.value,
                            })
                          }
                          placeholder="e.g., 123 Main Street"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            value={formData.city || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, city: e.target.value })
                            }
                            placeholder="e.g., Mumbai"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State *</Label>
                          <Input
                            id="state"
                            value={formData.state || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                state: e.target.value,
                              })
                            }
                            placeholder="e.g., Maharashtra"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pincode">Pincode *</Label>
                          <Input
                            id="pincode"
                            value={formData.pincode || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                pincode: e.target.value,
                              })
                            }
                            placeholder="e.g., 400001"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={formData.phone || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                phone: e.target.value,
                              })
                            }
                            placeholder="e.g., +91 9876543210"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                email: e.target.value,
                              })
                            }
                            placeholder="e.g., warehouse@example.com"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="manager">Manager Name</Label>
                        <Input
                          id="manager"
                          value={formData.manager || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              manager: e.target.value,
                            })
                          }
                          placeholder="e.g., John Doe"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setDialogOpen(false);
                          resetForm();
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1">
                        {editingWarehouse
                          ? "Update Warehouse"
                          : "Create Warehouse"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Delete Confirmation Dialog */}
              <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Warehouse?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete warehouse{" "}
                      <strong>{warehouseToDelete?.name}</strong> (
                      {warehouseToDelete?.code})? This will soft delete the
                      warehouse. It will be marked as deleted but can be
                      restored if needed. This action cannot be easily undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteConfirm}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
