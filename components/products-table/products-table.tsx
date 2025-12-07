'use client';

import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProductDialog } from '@/components/product-dialog';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import {
  fetchProducts,
  setSearch,
  setPage,
} from '@/store/slices/productsSlice';
import type { AppDispatch, RootState } from '@/store/store';
import type { Product } from '@/store/slices/productsSlice';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/constants';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ProductForm } from '@/components/product-form';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  FileSpreadsheet,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { CSVUploadDrawer } from '@/components/csv-upload-drawer/csv-upload-drawer';
import { ProductsMegaFilter } from '@/components/products-mega-filter';
import { setFilters } from '@/store/slices/productsSlice';
import { Image as ImageIcon } from 'lucide-react';

/**
 * ProductsTable component displays a paginated table of products with search, edit, view, delete, and CSV upload functionality.
 * Uses Redux for state management and provides full CRUD operations with soft delete confirmation.
 */
export function ProductsTable() {
  const dispatch = useDispatch<AppDispatch>();
  const { products, pagination, isLoading, error, search, filters } =
    useSelector((state: RootState) => state.products);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>(
    'view'
  );
  const [sheetMode, setSheetMode] = useState<'view' | 'edit' | 'create'>(
    'create'
  );
  const [csvUploadOpen, setCsvUploadOpen] = useState(false);

  useEffect(() => {
    dispatch(
      fetchProducts({
        page: pagination.page,
        limit: pagination.limit,
        search,
        filters,
      })
    );
  }, [dispatch, pagination.page, pagination.limit, search, filters]);

  const handleSearchChange = (value: string) => {
    dispatch(setSearch(value));
    dispatch(setPage(1));
  };

  const handlePageChange = (newPage: number) => {
    dispatch(setPage(newPage));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleView = (product: Product) => {
    setSelectedProduct(product);
    setDialogMode('view');
    setDialogOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setSheetMode('edit');
    setSheetOpen(true);
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setSheetMode('create');
    setSheetOpen(true);
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedProduct) return;

    try {
      await apiClient.delete(API_ENDPOINTS.PRODUCTS.BY_ID(selectedProduct.id));
      dispatch(
        fetchProducts({
          page: pagination.page,
          limit: pagination.limit,
          search,
        })
      );
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
      toast.success('Product deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete product');
    }
  };

  const handleSave = async (productData: Partial<Product>) => {
    try {
      if (selectedProduct && sheetMode === 'edit') {
        await apiClient.put(
          API_ENDPOINTS.PRODUCTS.BY_ID(selectedProduct.id),
          productData
        );
        toast.success('Product updated successfully');
      } else {
        await apiClient.post(API_ENDPOINTS.PRODUCTS.BASE, productData);
        toast.success('Product created successfully');
      }

      dispatch(
        fetchProducts({
          page: pagination.page,
          limit: pagination.limit,
          search,
        })
      );
      setSheetOpen(false);
      setDialogOpen(false);
      setSelectedProduct(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save product');
      throw error;
    }
  };

  const handleBulkUpload = async (data: any[]) => {
    // Transform CSV data to product format
    const products = data.map((row) => ({
      sku: row.sku || '',
      name: row.name || '',
      brand: row.brand || 'CERA',
      category: row.category || '',
      productType: row.productType || '',
      quantity: parseFloat(row.quantity || '0'),
      mrp: parseFloat(row.mrp || '0'),
      purchasePrice: parseFloat(row.purchasePrice || '0'),
      sellingPrice: parseFloat(row.sellingPrice || '0'),
      lowStockThreshold: parseFloat(row.lowStockThreshold || '10'),
      reorderPoint: parseFloat(row.reorderPoint || '5'),
      unit: row.unit || 'pcs',
      isActive: row.isActive !== 'false' && row.isActive !== '0',
      isDiscontinued:
        row.isDiscontinued === 'true' || row.isDiscontinued === '1',
      dimensions: row.dimensions || '',
      colors: row.colors
        ? typeof row.colors === 'string'
          ? row.colors.split(',').map((c) => c.trim())
          : row.colors
        : [],
      collection: row.collection || '',
      availableTillStocksLast:
        row.availableTillStocksLast === 'true' ||
        row.availableTillStocksLast === '1',
      certifications: row.certifications
        ? typeof row.certifications === 'string'
          ? row.certifications.split(',').map((c) => c.trim())
          : row.certifications
        : [],
      compatibility: row.compatibility || '',
      features: row.features
        ? typeof row.features === 'string'
          ? row.features.split(',').map((f) => f.trim())
          : row.features
        : [],
      finish: row.finish || '',
      notes: row.notes || '',
      productCodeSeries: row.productCodeSeries || '',
      productStructure: row.productStructure || '',
      variants_description: row.variants_description || '',
      size: row.size || '',
      grade: row.grade || '',
      boxCoverage: row.boxCoverage || '',
      batch: row.batch || '',
      designType: row.designType || '',
      series: row.series || '',
      material: row.material || '',
      warrantyInfo: row.warrantyInfo || '',
    }));

    // Send bulk upload request
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.PRODUCTS.BULK,
        products
      );
      toast.success(
        `Successfully uploaded ${
          response.data.insertedCount || products.length
        } products`
      );
      dispatch(
        fetchProducts({
          page: pagination.page,
          limit: pagination.limit,
          search,
        })
      );
    } catch (error: any) {
      toast.error(
        error.response?.data?.error ||
          error.message ||
          'Upload failed. Please try again.'
      );
      throw error;
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1">
            Manage your product catalog with ease
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-64 pl-9"
            />
          </div>
          <ProductsMegaFilter
            filters={filters}
            onFiltersChange={(newFilters) => dispatch(setFilters(newFilters))}
          />
          <Button
            variant="outline"
            size="default"
            onClick={() => setCsvUploadOpen(true)}
            className="shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="size-4 mr-2" />
            Upload CSV
          </Button>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                size="default"
                onClick={handleAddProduct}
                className="shadow-sm"
              >
                <Plus className="size-4 mr-2" />
                Add Product
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full sm:max-w-2xl p-0 flex flex-col"
            >
              <SheetHeader className="px-6 pt-6 pb-4 border-b">
                <SheetTitle className="text-2xl">
                  {sheetMode === 'create'
                    ? 'Add New Product'
                    : sheetMode === 'edit'
                    ? 'Edit Product'
                    : 'View Product'}
                </SheetTitle>
                <SheetDescription className="text-base mt-2">
                  {sheetMode === 'create'
                    ? 'Fill in the details to add a new product to your catalog.'
                    : sheetMode === 'edit'
                    ? 'Update the product information below.'
                    : 'Product details are displayed below.'}
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-hidden">
                <ProductForm
                  product={selectedProduct}
                  mode={sheetMode}
                  onSave={handleSave}
                  onCancel={() => setSheetOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Image</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">MRP</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}>
                      {j === 0 ? (
                        <Skeleton className="h-16 w-16 rounded" />
                      ) : (
                        <Skeleton className="h-4 w-full" />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center text-muted-foreground"
                >
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center justify-center w-16 h-16 bg-muted rounded border">
                      <ImageIcon className="size-6 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {product.sku}
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.brand}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.productType}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        product.quantity <= product.lowStockThreshold
                          ? 'font-semibold text-destructive'
                          : ''
                      }
                    >
                      {product.quantity} {product.unit}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{product.mrp.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {product.isActive && (
                        <Badge variant="outline" className="text-xs">
                          Active
                        </Badge>
                      )}
                      {product.isDiscontinued && (
                        <Badge variant="destructive" className="text-xs">
                          Discontinued
                        </Badge>
                      )}
                      {product.quantity <= product.lowStockThreshold && (
                        <Badge
                          variant="outline"
                          className="text-xs text-orange-600"
                        >
                          Low Stock
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(product)}>
                          <Eye className="size-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedProduct(product);
                            setSheetMode('edit');
                            setSheetOpen(true);
                          }}
                        >
                          <Edit className="size-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(product)}
                          className="text-destructive"
                        >
                          <Trash2 className="size-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-muted/30 p-4">
        <div className="text-sm text-muted-foreground">
          Showing{' '}
          <span className="font-medium text-foreground">
            {products.length > 0
              ? (pagination.page - 1) * pagination.limit + 1
              : 0}
          </span>{' '}
          to{' '}
          <span className="font-medium text-foreground">
            {Math.min(pagination.page * pagination.limit, pagination.total)}
          </span>{' '}
          of{' '}
          <span className="font-medium text-foreground">
            {pagination.total}
          </span>{' '}
          products
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="default"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1 || isLoading}
            className="shadow-sm"
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <div className="text-sm font-medium px-3 py-1.5 rounded-md bg-background border">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <Button
            variant="outline"
            size="default"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || isLoading}
            className="shadow-sm"
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
        mode={dialogMode}
        onSave={handleSave}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        productName={selectedProduct?.name}
      />

      <CSVUploadDrawer
        open={csvUploadOpen}
        onOpenChange={setCsvUploadOpen}
        storageKey="products"
        title="Upload Products CSV"
        description="Upload CSV file with product data. Edit the table before publishing to database."
        onPublish={handleBulkUpload}
      />
    </div>
  );
}
