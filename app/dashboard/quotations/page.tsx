'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout/dashboard-layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { APP_PATHS, API_ENDPOINTS } from '@/lib/constants';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Trash2,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TableSkeleton } from '@/components/skeletons/table-skeleton';
import { CSVUploadDrawer } from '@/components/csv-upload-drawer/csv-upload-drawer';

interface Quotation {
  id: string;
  quotationNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: string;
  total?: number;
  validUntil: string;
  createdAt: string;
}

/**
 * Quotations page displays all quotations with search and filter capabilities.
 */
export default function QuotationsPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<{
    id: string;
    quotationNumber: string;
  } | null>(null);
  const [csvUploadOpen, setCsvUploadOpen] = useState(false);

  const fetchQuotations = async () => {
    setIsLoadingQuotations(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await apiClient.get<{
        quotations: Quotation[];
        pagination: {
          total: number;
          totalPages: number;
        };
      }>(`${API_ENDPOINTS.QUOTATIONS.BASE}?${params.toString()}`);
      setQuotations(response.data.quotations || []);
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.totalPages || 0,
      }));
    } catch (error: unknown) {
      console.error('Failed to fetch quotations:', error);
      const errorMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { error?: string } } }).response
              ?.data?.error
          : 'Failed to load quotations';
      toast.error(errorMessage || 'Failed to load quotations');
    } finally {
      setIsLoadingQuotations(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, statusFilter]);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchQuotations();
  };

  // Auto-search when searchTerm changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchQuotations();
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleDeleteClick = (id: string, quotationNumber: string) => {
    setQuotationToDelete({ id, quotationNumber });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!quotationToDelete) return;

    try {
      await apiClient.delete(
        API_ENDPOINTS.QUOTATIONS.BY_ID(quotationToDelete.id)
      );
      toast.success(
        `Quotation ${quotationToDelete.quotationNumber} deleted successfully`
      );
      setDeleteDialogOpen(false);
      setQuotationToDelete(null);
      fetchQuotations();
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { error?: string } } }).response
              ?.data?.error
          : 'Failed to delete quotation';
      toast.error(errorMessage || 'Failed to delete quotation');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      'default' | 'secondary' | 'destructive' | 'outline'
    > = {
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
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotations</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all your quotations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="default"
            onClick={() => setCsvUploadOpen(true)}
            className="cursor-pointer"
          >
            <FileSpreadsheet className="size-4 mr-2" />
            Upload CSV
          </Button>
          <Button
            size="default"
            onClick={() => router.push(APP_PATHS.QUOTATION_CREATE)}
          >
            <Plus className="size-4 mr-2" />
            New Quotation
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Quotations</CardTitle>
              <CardDescription>
                {pagination.total} total quotations found
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by number, customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-8 w-64"
                />
              </div>
              <Button variant="outline" size="default" onClick={handleSearch}>
                Search
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingQuotations ? (
            <TableSkeleton
              rows={10}
              columns={8}
              columnWidths={[120, 150, 180, 100, 100, 120, 120, 120]}
            />
          ) : quotations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="size-12 mx-auto mb-4 opacity-50" />
              <p>No quotations found</p>
              <p className="text-sm mt-2">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try a different search or filter'
                  : 'Create your first quotation'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quotation #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((quotation) => (
                    <TableRow key={quotation.id}>
                      <TableCell className="font-medium">
                        {quotation.quotationNumber}
                      </TableCell>
                      <TableCell>{quotation.customerName}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {quotation.customerEmail && (
                            <div>{quotation.customerEmail}</div>
                          )}
                          {quotation.customerPhone && (
                            <div className="text-muted-foreground">
                              {quotation.customerPhone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₹
                        {typeof quotation.total === 'number'
                          ? quotation.total.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : '0.00'}
                      </TableCell>
                      <TableCell>{formatDate(quotation.validUntil)}</TableCell>
                      <TableCell>{formatDate(quotation.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              router.push(
                                APP_PATHS.QUOTATION_VIEW(quotation.id)
                              )
                            }
                            className="h-8 w-8"
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              router.push(
                                APP_PATHS.QUOTATION_VIEW(quotation.id)
                              )
                            }
                            className="h-8 w-8"
                          >
                            <Download className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleDeleteClick(
                                quotation.id,
                                quotation.quotationNumber
                              )
                            }
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: prev.page - 1,
                    }))
                  }
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: prev.page + 1,
                    }))
                  }
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CSVUploadDrawer
        open={csvUploadOpen}
        onOpenChange={setCsvUploadOpen}
        storageKey="quotations"
        title="Upload Quotations CSV"
        description="Upload CSV file with quotation data. Edit the table before publishing to database."
        onPublish={async (data) => {
          // Transform CSV data to quotation format and create each quotation
          for (const row of data) {
            // Extract items from CSV (assuming items are in a specific format)
            // You may need to adjust this based on your CSV structure
            const items = [];
            if (row.items) {
              try {
                const parsedItems = JSON.parse(row.items);
                items.push(...parsedItems);
              } catch {
                // If items is not JSON, try to parse as comma-separated
                const itemStrings = row.items.split(';');
                for (const itemStr of itemStrings) {
                  const [sku, quantity, unitPrice] = itemStr.split(',');
                  if (sku && quantity && unitPrice) {
                    items.push({
                      sku: sku.trim(),
                      quantity: parseFloat(quantity.trim()),
                      unitPrice: parseFloat(unitPrice.trim()),
                    });
                  }
                }
              }
            }

            const payload = {
              customerName: row.customerName || '',
              customerEmail: row.customerEmail || '',
              customerPhone: row.customerPhone || '',
              customerAddress: row.customerAddress || '',
              items: items.length > 0 ? items : [],
              taxRate: parseFloat(row.taxRate || '0'),
              discount: parseFloat(row.discount || '0'),
              validDays: parseInt(row.validDays || '30'),
              notes: row.notes || '',
            };

            await apiClient.post(API_ENDPOINTS.QUOTATIONS.BASE, payload);
          }

          // Refresh quotations list
          fetchQuotations();
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete quotation{' '}
              <strong>{quotationToDelete?.quotationNumber}</strong>? This will
              soft delete the quotation. It will be marked as deleted but can be
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
    </DashboardLayout>
  );
}
