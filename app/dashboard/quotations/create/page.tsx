"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
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
import { Textarea } from "@/components/ui/textarea";
import { SIDEBAR_CONFIG, APP_PATHS, API_ENDPOINTS } from "@/lib/constants";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { fetchUser } from "@/store/slices/authSlice";
import { FileText, Plus, X, ArrowLeft } from "lucide-react";
import type { AppDispatch, RootState } from "@/store/store";
import { SkuAutocomplete } from "@/components/sku-autocomplete/sku-autocomplete";

interface QuotationItem {
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

/**
 * Create Quotation page allows users to create detailed quotations with products.
 */
export default function CreateQuotationPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector(
    (state: RootState) => state.auth
  );
  const [isMounted, setIsMounted] = useState(false);
  const [items, setItems] = useState<QuotationItem[]>([
    {
      sku: "",
      productName: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      total: 0,
    },
  ]);
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    taxRate: 0,
    validDays: 30,
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const addItem = () => {
    setItems([
      ...items,
      {
        sku: "",
        productName: "",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        total: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    } else {
      toast.error("At least one item is required");
    }
  };

  const updateItem = (
    index: number,
    field: keyof QuotationItem,
    value: string | number
  ) => {
    const newItems = [...items];
    const item = newItems[index];

    if (field === "sku") {
      item.sku = value as string;
    } else if (field === "quantity") {
      item.quantity = value as number;
    } else if (field === "unitPrice") {
      item.unitPrice = value as number;
    } else if (field === "discount") {
      item.discount = value as number;
    }

    // Calculate total: (quantity * unitPrice) - (discount% of quantity * unitPrice)
    const itemSubtotal = item.quantity * item.unitPrice;
    const discountAmount = itemSubtotal * ((item.discount || 0) / 100);
    item.total = Math.max(0, itemSubtotal - discountAmount);
    newItems[index] = item;
    setItems(newItems);
  };

  const handleSkuSelect = (index: number, sku: string, product?: any) => {
    const newItems = [...items];
    const item = newItems[index];
    item.sku = sku;
    item.productName = product?.name || "";

    // Use MRP from product data (now included in SkuAutocomplete response)
    item.unitPrice = product?.mrp || product?.price || 0;

    const itemSubtotal = item.quantity * item.unitPrice;
    const discountAmount = itemSubtotal * ((item.discount || 0) / 100);
    item.total = Math.max(0, itemSubtotal - discountAmount);
    newItems[index] = item;
    setItems(newItems);
  };

  const calculateTotals = () => {
    // Calculate subtotal before discounts
    const subtotalBeforeDiscount = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    // Calculate total discount (sum of all item discounts)
    const totalDiscount = items.reduce(
      (sum, item) => sum + (item.discount || 0),
      0
    );
    // Calculate subtotal after discounts
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    // Calculate tax on subtotal after discounts
    const tax = subtotal * ((formData.taxRate || 0) / 100);
    // Calculate final total
    const total = subtotal + tax;
    return { subtotal, totalDiscount, tax, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    const validItems = items.filter(
      (item) => item.sku && item.quantity > 0 && item.unitPrice > 0
    );
    if (validItems.length === 0) {
      toast.error("Please add at least one valid product");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        items: validItems.map((item) => ({
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
        })),
      };

      const response = await apiClient.post(
        API_ENDPOINTS.QUOTATIONS.BASE,
        payload
      );
      toast.success(
        `Quotation ${response.data.quotationNumber} created successfully!`
      );
      router.push(APP_PATHS.QUOTATION_VIEW(response.data.id));
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create quotation");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted || isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const { subtotal, totalDiscount, tax, total } = calculateTotals();

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
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push(APP_PATHS.QUOTATIONS)}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    Create Quotation
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Create a detailed quotation for your customer
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Information</CardTitle>
                    <CardDescription>
                      Enter customer details for this quotation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customerName">Customer Name *</Label>
                        <Input
                          id="customerName"
                          value={formData.customerName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customerName: e.target.value,
                            })
                          }
                          placeholder="e.g., John Doe"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customerEmail">Email</Label>
                        <Input
                          id="customerEmail"
                          type="email"
                          value={formData.customerEmail}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customerEmail: e.target.value,
                            })
                          }
                          placeholder="customer@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customerPhone">Phone</Label>
                        <Input
                          id="customerPhone"
                          value={formData.customerPhone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customerPhone: e.target.value,
                            })
                          }
                          placeholder="+91 1234567890"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="validDays">Valid For (Days)</Label>
                        <Input
                          id="validDays"
                          type="number"
                          value={formData.validDays}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              validDays: parseInt(e.target.value) || 30,
                            })
                          }
                          min={1}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerAddress">Address</Label>
                      <Textarea
                        id="customerAddress"
                        value={formData.customerAddress}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customerAddress: e.target.value,
                          })
                        }
                        placeholder="Customer address..."
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Products</CardTitle>
                        <CardDescription>
                          Add products to the quotation
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
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-4 p-4 border rounded-lg"
                      >
                        <div className="col-span-3 space-y-2">
                          <Label>SKU / Product Code *</Label>
                          <SkuAutocomplete
                            value={item.sku}
                            onChange={(sku, product) =>
                              handleSkuSelect(index, sku, product)
                            }
                            placeholder="e.g., S2020181FG"
                            required
                          />
                          {item.productName && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.productName}
                            </p>
                          )}
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Quantity *</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "quantity",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="1"
                            required
                            min={0.01}
                            step={0.01}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Unit Price *</Label>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "unitPrice",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0.00"
                            required
                            min={0}
                            step={0.01}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Discount (%)</Label>
                          <Input
                            type="number"
                            value={item.discount || 0}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "discount",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                            min={0}
                            max={100}
                            step={0.01}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Total</Label>
                          <Input
                            value={`₹${item.total.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`}
                            disabled
                            className="bg-muted font-medium"
                          />
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

                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Additional Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="taxRate">Tax Rate (%)</Label>
                        <Input
                          id="taxRate"
                          type="number"
                          value={formData.taxRate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              taxRate: parseFloat(e.target.value) || 0,
                            })
                          }
                          min={0}
                          max={100}
                          step={0.01}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) =>
                            setFormData({ ...formData, notes: e.target.value })
                          }
                          placeholder="Additional notes..."
                          rows={4}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">
                          ₹
                          {subtotal.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax %</span>
                        <span className="font-medium">{formData.taxRate}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Tax Amount
                        </span>
                        <span className="font-medium">
                          ₹
                          {tax.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between">
                          <span className="text-lg font-semibold">Total</span>
                          <span className="text-lg font-bold">
                            ₹
                            {total.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="h-10"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="h-10"
                    disabled={isSubmitting}
                  >
                    <FileText className="size-4 mr-2" />
                    {isSubmitting ? "Creating..." : "Create Quotation"}
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
