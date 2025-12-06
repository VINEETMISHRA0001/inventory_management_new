'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { SIDEBAR_CONFIG, APP_PATHS, API_ENDPOINTS } from '@/lib/constants';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { fetchUser } from '@/store/slices/authSlice';
import { ArrowLeft, Download, Printer, FileText, CheckCircle2, XCircle } from 'lucide-react';
import type { AppDispatch, RootState } from '@/store/store';
import { QuotationRejectDialog } from '@/components/quotation-reject-dialog';

interface QuotationItem {
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Quotation {
  id: string;
  quotationNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  status: string;
  items: QuotationItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  discount: number;
  total: number;
  validUntil: string;
  notes: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  } | null;
}

/**
 * Quotation View page displays quotation details with print and mini bill generation.
 */
export default function QuotationViewPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const [isMounted, setIsMounted] = useState(false);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [isLoadingQuotation, setIsLoadingQuotation] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (params.id) {
      fetchQuotation();
    }
  }, [params.id]);

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

  const fetchQuotation = async () => {
    setIsLoadingQuotation(true);
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.QUOTATIONS.BY_ID(params.id as string)
      );
      setQuotation(response.data);
    } catch (error: any) {
      console.error('Failed to fetch quotation:', error);
      toast.error(error.response?.data?.error || 'Failed to load quotation');
      router.push(APP_PATHS.QUOTATIONS);
    } finally {
      setIsLoadingQuotation(false);
    }
  };

  const handleApprove = async () => {
    if (!quotation) return;
    
    setIsUpdatingStatus(true);
    try {
      await apiClient.post(API_ENDPOINTS.QUOTATIONS.APPROVE(quotation.id));
      toast.success(`Quotation ${quotation.quotationNumber} approved successfully`);
      fetchQuotation(); // Refresh quotation data
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve quotation');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRejectClick = () => {
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!quotation) return;
    
    setIsUpdatingStatus(true);
    try {
      await apiClient.post(API_ENDPOINTS.QUOTATIONS.REJECT(quotation.id), {
        reason: reason || '',
      });
      toast.success(`Quotation ${quotation.quotationNumber} rejected successfully`);
      fetchQuotation(); // Refresh quotation data
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject quotation');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateBill = async () => {
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.QUOTATIONS.GENERATE_BILL(params.id as string)
      );
      const billData = response.data.bill;
      
      // Create printable bill HTML
      const billHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Bill - ${billData.quotationNumber}</title>
            <style>
              @media print {
                body { margin: 0; padding: 20px; }
                .no-print { display: none; }
              }
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
              .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
              .bill-info { display: flex; justify-content: space-between; margin: 20px 0; }
              .customer-info { margin: 20px 0; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background-color: #f5f5f5; font-weight: bold; }
              .text-right { text-align: right; }
              .total-section { margin-top: 20px; padding-top: 20px; border-top: 2px solid #000; }
              .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
              .grand-total { font-size: 18px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-name">Acme Inc.</div>
              <div>Inventory Management System</div>
            </div>
            <div class="bill-info">
              <div>
                <strong>Bill Number:</strong> ${billData.quotationNumber}<br>
                <strong>Date:</strong> ${billData.date}
              </div>
              <div>
                <strong>Valid Until:</strong> ${billData.validUntil}
              </div>
            </div>
            <div class="customer-info">
              <strong>Bill To:</strong><br>
              ${billData.customer.name}<br>
              ${billData.customer.email ? billData.customer.email + '<br>' : ''}
              ${billData.customer.phone ? billData.customer.phone + '<br>' : ''}
              ${billData.customer.address ? billData.customer.address : ''}
            </div>
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th class="text-right">Qty</th>
                  <th class="text-right">Unit Price</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${billData.items.map((item: any) => `
                  <tr>
                    <td>${item.sku || ''}</td>
                    <td>${item.productName || ''}</td>
                    <td class="text-right">${item.quantity || 0}</td>
                    <td class="text-right">₹${(item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="text-right">₹${(item.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total-section">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>₹${(billData.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              ${(billData.discount || 0) > 0 ? `
                <div class="total-row">
                  <span>Discount:</span>
                  <span>-₹${(billData.discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ` : ''}
              ${(billData.tax || 0) > 0 ? `
                <div class="total-row">
                  <span>Tax (${billData.taxRate || 0}%):</span>
                  <span>₹${(billData.tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ` : ''}
              <div class="total-row grand-total">
                <span>Grand Total:</span>
                <span>₹${(billData.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            ${billData.notes ? `<div style="margin-top: 20px;"><strong>Notes:</strong> ${billData.notes}</div>` : ''}
            <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
              Generated by ${billData.createdBy?.name || 'System'} on ${new Date().toLocaleString()}
            </div>
          </body>
        </html>
      `;

      // Open print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(billHTML);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
        toast.success('Bill generated successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate bill');
    }
  };

  if (!isMounted || isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isLoadingQuotation) {
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
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-muted-foreground">Loading quotation...</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!quotation) {
    return null;
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'outline',
      sent: 'secondary',
      accepted: 'default',
      approved: 'default',
      rejected: 'destructive',
      expired: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
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
              <div className="flex items-center justify-between no-print">
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
                    <h1 className="text-3xl font-bold tracking-tight">Quotation Details</h1>
                    <p className="text-muted-foreground mt-1">
                      {quotation.quotationNumber}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {quotation.status !== 'approved' && quotation.status !== 'rejected' && (
                    <>
                      <Button
                        variant="default"
                        onClick={handleApprove}
                        disabled={isUpdatingStatus}
                      >
                        <CheckCircle2 className="size-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleRejectClick}
                        disabled={isUpdatingStatus}
                      >
                        <XCircle className="size-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  )}
                  <Button variant="outline" onClick={handleGenerateBill}>
                    <Download className="size-4 mr-2" />
                    Generate Mini Bill
                  </Button>
                  <Button variant="outline" onClick={handlePrint}>
                    <Printer className="size-4 mr-2" />
                    Print
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Quotation Information</CardTitle>
                          <CardDescription>Complete quotation details</CardDescription>
                        </div>
                        {getStatusBadge(quotation.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Quotation Number</Label>
                          <p className="text-sm font-medium">{quotation.quotationNumber}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                          <p className="text-sm">{formatDate(quotation.createdAt)}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Valid Until</Label>
                          <p className="text-sm">{formatDate(quotation.validUntil)}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                          <div>{getStatusBadge(quotation.status)}</div>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Customer Information</Label>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-medium">{quotation.customerName}</p>
                          {quotation.customerEmail && (
                            <p className="text-sm text-muted-foreground">{quotation.customerEmail}</p>
                          )}
                          {quotation.customerPhone && (
                            <p className="text-sm text-muted-foreground">{quotation.customerPhone}</p>
                          )}
                          {quotation.customerAddress && (
                            <p className="text-sm text-muted-foreground">{quotation.customerAddress}</p>
                          )}
                        </div>
                      </div>

                      {quotation.notes && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                          <p className="text-sm mt-1">{quotation.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Products</CardTitle>
                      <CardDescription>{quotation.items.length} item(s) in this quotation</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 text-sm font-medium">SKU</th>
                              <th className="text-left py-2 px-3 text-sm font-medium">Product</th>
                              <th className="text-right py-2 px-3 text-sm font-medium">Quantity</th>
                              <th className="text-right py-2 px-3 text-sm font-medium">Unit Price</th>
                              <th className="text-right py-2 px-3 text-sm font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quotation.items.map((item, index) => (
                              <tr key={index} className="border-b">
                                <td className="py-2 px-3 text-sm">{item.sku}</td>
                                <td className="py-2 px-3 text-sm">{item.productName}</td>
                                <td className="py-2 px-3 text-sm text-right">{item.quantity}</td>
                                <td className="py-2 px-3 text-sm text-right">
                                  ₹{(item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-2 px-3 text-sm text-right font-medium">
                                  ₹{(item.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">₹{(quotation.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      {(quotation.discount || 0) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Discount</span>
                          <span className="font-medium text-muted-foreground">-₹{(quotation.discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {(quotation.tax || 0) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tax ({quotation.taxRate || 0}%)</span>
                          <span className="font-medium">₹{(quotation.tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between">
                          <span className="text-lg font-semibold">Total</span>
                          <span className="text-lg font-bold">₹{(quotation.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {quotation.createdBy && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Created By</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm font-medium">{quotation.createdBy.name}</p>
                        <p className="text-sm text-muted-foreground">{quotation.createdBy.email}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

      {quotation && (
        <QuotationRejectDialog
          open={rejectDialogOpen}
          onOpenChange={setRejectDialogOpen}
          onConfirm={handleRejectConfirm}
          quotationNumber={quotation.quotationNumber}
        />
      )}
    </SidebarProvider>
  );
}

