'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_ENDPOINTS, APP_PATHS } from '@/lib/constants';
import { apiClient } from '@/lib/api-client';
import { Search, Eye, ArrowLeft } from 'lucide-react';
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
  fromWarehouse: { id: string; name: string; code: string } | null;
  toWarehouse: { id: string; name: string; code: string } | null;
  items: Array<{ sku: string; quantity: number; batch?: string; fromSku?: string; toSku?: string; fromQuantity?: number; toQuantity?: number; reason?: string; condition?: string }>;
  supplierReference?: string;
  purchaseOrderNumber?: string;
  orderReference?: string;
  customerName?: string;
  receivedDate?: string;
  saleDate?: string;
  transferDate?: string;
  damageDate?: string;
  adjustmentDate?: string;
  returnDate?: string;
  exchangeDate?: string;
  reason?: string;
  returnReason?: string;
  notes?: string;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
}

interface StockOperationsHistoryProps {
  operationType: string;
  title: string;
  description: string;
  backPath: string;
  newOperationPath: string;
  icon: React.ComponentType<{ className?: string }>;
  searchPlaceholder?: string;
}

export function StockOperationsHistory({
  operationType,
  title,
  description,
  backPath,
  newOperationPath,
  icon: Icon,
  searchPlaceholder = 'Search operations...',
}: StockOperationsHistoryProps) {
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
  }, [pagination.page, operationType]);

  const fetchOperations = async () => {
    setIsLoadingOperations(true);
    try {
      const response = await apiClient.get(
        `${API_ENDPOINTS.STOCK.OPERATIONS}?type=${operationType}&page=${pagination.page}&limit=${pagination.limit}`
      );
      setOperations(response.data.operations || []);
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.totalPages || 0,
      }));
    } catch (error) {
      console.error(`Failed to fetch ${operationType} operations:`, error);
    } finally {
      setIsLoadingOperations(false);
    }
  };

  const filteredOperations = operations.filter((op) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      op.supplierReference?.toLowerCase().includes(searchLower) ||
      op.purchaseOrderNumber?.toLowerCase().includes(searchLower) ||
      op.orderReference?.toLowerCase().includes(searchLower) ||
      op.customerName?.toLowerCase().includes(searchLower) ||
      op.warehouse?.name?.toLowerCase().includes(searchLower) ||
      op.warehouse?.code?.toLowerCase().includes(searchLower) ||
      op.fromWarehouse?.name?.toLowerCase().includes(searchLower) ||
      op.toWarehouse?.name?.toLowerCase().includes(searchLower) ||
      op.items.some((item) => item.sku?.toLowerCase().includes(searchLower) || item.fromSku?.toLowerCase().includes(searchLower) || item.toSku?.toLowerCase().includes(searchLower))
    );
  });

  const formatDate = (dateString?: string) => {
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

  const getOperationDate = (op: StockOperation) => {
    return op.receivedDate || op.saleDate || op.transferDate || op.damageDate || op.adjustmentDate || op.returnDate || op.exchangeDate || op.createdAt;
  };

  const handleView = (operation: StockOperation) => {
    setSelectedOperation(operation);
    setViewDialogOpen(true);
  };

  const getTableHeaders = () => {
    const baseHeaders = ['Date', 'Warehouse', 'Items', 'Total Quantity', 'Status', 'Created By', 'Actions'];
    
    if (operationType === 'stock_transfer') {
      return ['Date', 'From', 'To', 'Items', 'Total Quantity', 'Status', 'Created By', 'Actions'];
    }
    
    if (operationType === 'stock_in') {
      return ['Date', 'Warehouse', 'Supplier Ref', 'PO Number', 'Items', 'Total Quantity', 'Status', 'Created By', 'Actions'];
    }
    
    if (operationType === 'stock_out') {
      return ['Date', 'Warehouse', 'Order Ref', 'Customer', 'Items', 'Total Quantity', 'Status', 'Created By', 'Actions'];
    }
    
    if (operationType === 'damage') {
      return ['Date', 'Warehouse', 'Items', 'Reason', 'Total Quantity', 'Status', 'Created By', 'Actions'];
    }
    
    return baseHeaders;
  };

  const renderTableRow = (operation: StockOperation) => {
    const totalQuantity = operation.items.reduce(
      (sum, item) => sum + (item.quantity || item.fromQuantity || item.toQuantity || 0),
      0
    );
    const date = getOperationDate(operation);

    if (operationType === 'stock_transfer') {
      return (
        <TableRow key={operation.id}>
          <TableCell className="font-medium">{formatDate(date)}</TableCell>
          <TableCell>
            {operation.fromWarehouse ? (
              <div>
                <div className="font-medium">{operation.fromWarehouse.name}</div>
                <div className="text-xs text-muted-foreground">{operation.fromWarehouse.code}</div>
              </div>
            ) : (
              '—'
            )}
          </TableCell>
          <TableCell>
            {operation.toWarehouse ? (
              <div>
                <div className="font-medium">{operation.toWarehouse.name}</div>
                <div className="text-xs text-muted-foreground">{operation.toWarehouse.code}</div>
              </div>
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
          <TableCell className="font-medium">{totalQuantity.toLocaleString()}</TableCell>
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
                <div className="text-xs text-muted-foreground">{operation.createdBy.email}</div>
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
    }

    if (operationType === 'stock_in') {
      return (
        <TableRow key={operation.id}>
          <TableCell className="font-medium">{formatDate(date)}</TableCell>
          <TableCell>
            {operation.warehouse ? (
              <div>
                <div className="font-medium">{operation.warehouse.name}</div>
                <div className="text-xs text-muted-foreground">{operation.warehouse.code}</div>
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
          <TableCell className="font-medium">{totalQuantity.toLocaleString()}</TableCell>
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
                <div className="text-xs text-muted-foreground">{operation.createdBy.email}</div>
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
    }

    if (operationType === 'stock_out') {
      return (
        <TableRow key={operation.id}>
          <TableCell className="font-medium">{formatDate(date)}</TableCell>
          <TableCell>
            {operation.warehouse ? (
              <div>
                <div className="font-medium">{operation.warehouse.name}</div>
                <div className="text-xs text-muted-foreground">{operation.warehouse.code}</div>
              </div>
            ) : (
              '—'
            )}
          </TableCell>
          <TableCell>
            {operation.orderReference ? (
              <Badge variant="outline">{operation.orderReference}</Badge>
            ) : (
              '—'
            )}
          </TableCell>
          <TableCell>{operation.customerName || '—'}</TableCell>
          <TableCell>
            <div className="text-sm">
              {operation.items.length} product{operation.items.length !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-muted-foreground">
              {operation.items.slice(0, 2).map((item) => item.sku).join(', ')}
              {operation.items.length > 2 && '...'}
            </div>
          </TableCell>
          <TableCell className="font-medium">{totalQuantity.toLocaleString()}</TableCell>
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
                <div className="text-xs text-muted-foreground">{operation.createdBy.email}</div>
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
    }

    // Damage operation row
    if (operationType === 'damage') {
      const reasons = operation.items.map(item => item.reason).filter(Boolean);
      const uniqueReasons = [...new Set(reasons)];
      return (
        <TableRow key={operation.id}>
          <TableCell className="font-medium">{formatDate(date)}</TableCell>
          <TableCell>
            {operation.warehouse ? (
              <div>
                <div className="font-medium">{operation.warehouse.name}</div>
                <div className="text-xs text-muted-foreground">{operation.warehouse.code}</div>
              </div>
            ) : (
              '—'
            )}
          </TableCell>
          <TableCell>
            <div className="text-sm">
              {operation.items.length} product{operation.items.length !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-muted-foreground">
              {operation.items.slice(0, 2).map((item) => item.sku).filter(Boolean).join(', ')}
              {operation.items.length > 2 && '...'}
            </div>
          </TableCell>
          <TableCell>
            {uniqueReasons.length > 0 ? (
              <div className="space-y-1">
                {uniqueReasons.slice(0, 2).map((reason, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {reason.replace('_', ' ')}
                  </Badge>
                ))}
                {uniqueReasons.length > 2 && (
                  <span className="text-xs text-muted-foreground">+{uniqueReasons.length - 2} more</span>
                )}
              </div>
            ) : (
              '—'
            )}
          </TableCell>
          <TableCell className="font-medium">{totalQuantity.toLocaleString()}</TableCell>
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
                <div className="text-xs text-muted-foreground">{operation.createdBy.email}</div>
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
    }

    // Default row for other operation types
    return (
      <TableRow key={operation.id}>
        <TableCell className="font-medium">{formatDate(date)}</TableCell>
        <TableCell>
          {operation.warehouse ? (
            <div>
              <div className="font-medium">{operation.warehouse.name}</div>
              <div className="text-xs text-muted-foreground">{operation.warehouse.code}</div>
            </div>
          ) : (
            '—'
          )}
        </TableCell>
        <TableCell>
          <div className="text-sm">
            {operation.items.length} product{operation.items.length !== 1 ? 's' : ''}
          </div>
          <div className="text-xs text-muted-foreground">
            {operation.items.slice(0, 2).map((item) => item.sku || item.fromSku || item.toSku).filter(Boolean).join(', ')}
            {operation.items.length > 2 && '...'}
          </div>
        </TableCell>
        <TableCell className="font-medium">{totalQuantity.toLocaleString()}</TableCell>
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
              <div className="text-xs text-muted-foreground">{operation.createdBy.email}</div>
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
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(backPath)}
              className="h-8 w-8"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          </div>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
        <Button onClick={() => router.push(newOperationPath)}>
          <Icon className="size-4 mr-2" />
          New Operation
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{pagination.total} total operations found</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
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
              columns={getTableHeaders().length}
              columnWidths={Array.from({ length: getTableHeaders().length }).map(() => '100%')}
            />
          ) : filteredOperations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icon className="size-12 mx-auto mb-4 opacity-50" />
              <p>No operations found</p>
              <p className="text-sm mt-2">
                {searchTerm ? 'Try a different search term' : 'Create your first operation'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {getTableHeaders().map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>{filteredOperations.map(renderTableRow)}</TableBody>
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

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title} - Details</DialogTitle>
            <DialogDescription>Complete details of the operation</DialogDescription>
          </DialogHeader>
          {selectedOperation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date</label>
                  <p className="text-sm">{formatDate(getOperationDate(selectedOperation))}</p>
                </div>
                {selectedOperation.warehouse && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Warehouse</label>
                    <p className="text-sm">
                      {selectedOperation.warehouse.name} ({selectedOperation.warehouse.code})
                    </p>
                  </div>
                )}
                {selectedOperation.fromWarehouse && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">From Warehouse</label>
                    <p className="text-sm">
                      {selectedOperation.fromWarehouse.name} ({selectedOperation.fromWarehouse.code})
                    </p>
                  </div>
                )}
                {selectedOperation.toWarehouse && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">To Warehouse</label>
                    <p className="text-sm">
                      {selectedOperation.toWarehouse.name} ({selectedOperation.toWarehouse.code})
                    </p>
                  </div>
                )}
                {selectedOperation.supplierReference && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Supplier Reference</label>
                    <p className="text-sm">{selectedOperation.supplierReference}</p>
                  </div>
                )}
                {selectedOperation.purchaseOrderNumber && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Purchase Order</label>
                    <p className="text-sm">{selectedOperation.purchaseOrderNumber}</p>
                  </div>
                )}
                {selectedOperation.orderReference && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Order Reference</label>
                    <p className="text-sm">{selectedOperation.orderReference}</p>
                  </div>
                )}
                {selectedOperation.customerName && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Customer</label>
                    <p className="text-sm">{selectedOperation.customerName}</p>
                  </div>
                )}
                {selectedOperation.reason && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Reason</label>
                    <p className="text-sm">{selectedOperation.reason}</p>
                  </div>
                )}
                {selectedOperation.returnReason && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Return Reason</label>
                    <p className="text-sm">{selectedOperation.returnReason}</p>
                  </div>
                )}
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
                      {(operationType === 'exchange') && <TableHead>From SKU</TableHead>}
                      {(operationType === 'exchange') && <TableHead>To SKU</TableHead>}
                      <TableHead>Quantity</TableHead>
                      {(operationType === 'exchange') && <TableHead>From Qty</TableHead>}
                      {(operationType === 'exchange') && <TableHead>To Qty</TableHead>}
                      {selectedOperation.items.some((item) => item.batch) && <TableHead>Batch</TableHead>}
                      {(selectedOperation.items.some((item) => item.reason) || operationType === 'damage') && <TableHead>Reason</TableHead>}
                      {selectedOperation.items.some((item) => item.condition) && <TableHead>Condition</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOperation.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.sku || item.fromSku || item.toSku || '—'}</TableCell>
                        {operationType === 'exchange' && <TableCell>{item.fromSku || '—'}</TableCell>}
                        {operationType === 'exchange' && <TableCell>{item.toSku || '—'}</TableCell>}
                        <TableCell>{item.quantity?.toLocaleString() || '—'}</TableCell>
                        {operationType === 'exchange' && <TableCell>{item.fromQuantity?.toLocaleString() || '—'}</TableCell>}
                        {operationType === 'exchange' && <TableCell>{item.toQuantity?.toLocaleString() || '—'}</TableCell>}
                        {selectedOperation.items.some((i) => i.batch) && <TableCell>{item.batch || '—'}</TableCell>}
                        {(selectedOperation.items.some((i) => i.reason) || operationType === 'damage') && (
                          <TableCell>
                            {item.reason ? (
                              <Badge variant="outline">{item.reason.replace('_', ' ')}</Badge>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                        )}
                        {selectedOperation.items.some((i) => i.condition) && <TableCell>{item.condition || '—'}</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

