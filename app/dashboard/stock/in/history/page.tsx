'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { APP_PATHS, API_ENDPOINTS } from '@/lib/constants';
import { apiClient } from '@/lib/api-client';
import { ArrowDownCircle, ArrowLeft, Search, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/skeletons/table-skeleton';

interface StockOperation {
  id: string;
  type: string;
  status: string;
  warehouse: { id: string; name: string; code: string } | null;
  items: Array<{ sku: string; quantity: number; batch?: string }>;
  supplierReference: string;
  purchaseOrderNumber: string;
  receivedDate: string;
  notes: string;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
}

/**
 * Stock In History page displays all past stock in (GRN) operations.
 * Shows detailed history with filtering and search capabilities.
 */
export default function StockInHistoryPage() {
  const router = useRouter();
  const [operations, setOperations] = useState<StockOperation[]>([]);
  const [isLoadingOperations, setIsLoadingOperations] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOperation, setSelectedOperation] = useState<StockOperation | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchOperations();
  }, [pagination.page]);

  const fetchOperations = async () => {
    setIsLoadingOperations(true);
    try {
      const response = await apiClient.get(
        `${API_ENDPOINTS.STOCK.OPERATIONS}?type=stock_in&page=${pagination.page}&limit=${pagination.limit}`
      );
      setOperations(response.data.operations || []);
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.totalPages || 0,
      }));
    } catch (error) {
      console.error('Failed to fetch stock in operations:', error);
    } finally {
      setIsLoadingOperations(false);
    }
  };

  // Use DashboardLayout for consistent auth handling
  // No full-page loader needed - skeleton handles loading states

  const filteredOperations = operations.filter((op) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      op.supplierReference?.toLowerCase().includes(searchLower) ||
      op.purchaseOrderNumber?.toLowerCase().includes(searchLower) ||
      op.warehouse?.name?.toLowerCase().includes(searchLower) ||
      op.warehouse?.code?.toLowerCase().includes(searchLower) ||
      op.items.some((item) => item.sku?.toLowerCase().includes(searchLower))
    );
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleView = (operation: StockOperation) => {
    setSelectedOperation(operation);
    setViewDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(APP_PATHS.STOCK_IN)}
                      className="h-8 w-8"
                    >
                      <ArrowLeft className="size-4" />
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Stock In History</h1>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    View all past stock in (GRN) operations
                  </p>
                </div>
                <Button onClick={() => router.push(APP_PATHS.STOCK_IN)}>
                  <ArrowDownCircle className="size-4 mr-2" />
                  New Stock In
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Stock In Operations</CardTitle>
                      <CardDescription>
                        {pagination.total} total operations found
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by reference, PO, warehouse, SKU..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8 w-64"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingOperations ? (
                    <TableSkeleton
                      rows={10}
                      columns={9}
                      columnWidths={[120, 150, 150, 120, 150, 100, 100, 180, 80]}
                    />
                  ) : filteredOperations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ArrowDownCircle className="size-12 mx-auto mb-4 opacity-50" />
                      <p>No stock in operations found</p>
                      <p className="text-sm mt-2">
                        {searchTerm ? 'Try a different search term' : 'Create your first stock in operation'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Warehouse</TableHead>
                            <TableHead>Supplier Reference</TableHead>
                            <TableHead>PO Number</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Total Quantity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created By</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredOperations.map((operation) => {
                            const totalQuantity = operation.items.reduce(
                              (sum, item) => sum + (item.quantity || 0),
                              0
                            );
                            return (
                              <TableRow key={operation.id}>
                                <TableCell className="font-medium">
                                  {formatDate(operation.receivedDate || operation.createdAt)}
                                </TableCell>
                                <TableCell>
                                  {operation.warehouse ? (
                                    <div>
                                      <div className="font-medium">{operation.warehouse.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {operation.warehouse.code}
                                      </div>
                                    </div>
                                  ) : (
                                    '—'
                                  )}
                                </TableCell>
                                <TableCell>{operation.supplierReference || '—'}</TableCell>
                                <TableCell>
                                  {operation.purchaseOrderNumber ? (
                                    <Badge variant="outline">{operation.purchaseOrderNumber}</Badge>
                                  ) : (
                                    '—'
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {operation.items.length} product{operation.items.length !== 1 ? 's' : ''}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {operation.items.slice(0, 2).map((item) => item.sku).join(', ')}
                                    {operation.items.length > 2 && '...'}
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {totalQuantity.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      operation.status === 'completed'
                                        ? 'default'
                                        : operation.status === 'pending'
                                          ? 'secondary'
                                          : 'destructive'
                                    }
                                  >
                                    {operation.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {operation.createdBy ? (
                                    <div>
                                      <div className="text-sm">{operation.createdBy.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {operation.createdBy.email}
                                      </div>
                                    </div>
                                  ) : (
                                    '—'
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleView(operation)}
                                    className="h-8 w-8"
                                  >
                                    <Eye className="size-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
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
                          onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                          disabled={pagination.page === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                          disabled={pagination.page >= pagination.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
      </div>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stock In Operation Details</DialogTitle>
            <DialogDescription>
              Complete details of the stock in operation
            </DialogDescription>
          </DialogHeader>
          {selectedOperation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date</label>
                  <p className="text-sm">{formatDate(selectedOperation.receivedDate || selectedOperation.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Warehouse</label>
                  <p className="text-sm">
                    {selectedOperation.warehouse
                      ? `${selectedOperation.warehouse.name} (${selectedOperation.warehouse.code})`
                      : '—'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Supplier Reference</label>
                  <p className="text-sm">{selectedOperation.supplierReference || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Purchase Order</label>
                  <p className="text-sm">{selectedOperation.purchaseOrderNumber || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div>
                    <Badge
                      variant={
                        selectedOperation.status === 'completed'
                          ? 'default'
                          : selectedOperation.status === 'pending'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {selectedOperation.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created By</label>
                  <p className="text-sm">
                    {selectedOperation.createdBy
                      ? `${selectedOperation.createdBy.name} (${selectedOperation.createdBy.email})`
                      : '—'}
                  </p>
                </div>
              </div>

              {selectedOperation.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <p className="text-sm">{selectedOperation.notes}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Products ({selectedOperation.items.length})
                </label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Batch/Lot</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOperation.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.sku}</TableCell>
                        <TableCell>{item.quantity.toLocaleString()}</TableCell>
                        <TableCell>{item.batch || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

