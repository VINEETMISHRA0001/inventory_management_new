'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PRODUCT_CATEGORIES, PRODUCT_STOCK_TYPES, DEFAULT_BRAND } from '@/lib/constants';
import type { Product } from '@/store/slices/productsSlice';

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  mode: 'view' | 'edit' | 'create';
  onSave?: (product: Partial<Product>) => Promise<void>;
}

/**
 * ProductDialog component handles viewing, editing, and creating products.
 * Supports CERA-specific product categories and metadata fields.
 */
export function ProductDialog({
  open,
  onOpenChange,
  product,
  mode,
  onSave,
}: ProductDialogProps) {
  const [formData, setFormData] = useState<Partial<Product>>({
    sku: '',
    name: '',
    brand: DEFAULT_BRAND,
    category: '',
    productType: '',
    quantity: 0,
    mrp: 0,
    purchasePrice: 0,
    sellingPrice: 0,
    lowStockThreshold: 10,
    reorderPoint: 5,
    unit: PRODUCT_STOCK_TYPES.PIECE,
    isActive: true,
    isDiscontinued: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (product && mode !== 'create') {
      setFormData(product);
    } else if (mode === 'create') {
      setFormData({
        sku: '',
        name: '',
        brand: DEFAULT_BRAND,
        category: '',
        productType: '',
        quantity: 0,
        mrp: 0,
        purchasePrice: 0,
        sellingPrice: 0,
        lowStockThreshold: 10,
        reorderPoint: 5,
        unit: PRODUCT_STOCK_TYPES.PIECE,
        isActive: true,
        isDiscontinued: false,
      });
    }
  }, [product, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view' || !onSave) return;

    setIsLoading(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isReadOnly = mode === 'view';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'view' ? 'View Product' : mode === 'edit' ? 'Edit Product' : 'Create Product'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'view'
              ? 'Product details'
              : mode === 'edit'
              ? 'Update product information'
              : 'Add a new product to the catalog'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU / Product Code *</Label>
                <Input
                  id="sku"
                  value={formData.sku || ''}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={isReadOnly}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand *</Label>
                <Input
                  id="brand"
                  value={formData.brand || DEFAULT_BRAND}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  required
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category || ''}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  disabled={isReadOnly}
                  required
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PRODUCT_CATEGORIES).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productType">Product Type *</Label>
                <Input
                  id="productType"
                  value={formData.productType || ''}
                  onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                  required
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Stock Type *</Label>
                <Select
                  value={formData.unit || PRODUCT_STOCK_TYPES.PIECE}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                  disabled={isReadOnly}
                >
                  <SelectTrigger id="unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PRODUCT_STOCK_TYPES).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Purchase Price *</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })
                  }
                  required
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Selling Price *</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="0.01"
                  value={formData.sellingPrice || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })
                  }
                  required
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mrp">MRP *</Label>
                <Input
                  id="mrp"
                  type="number"
                  step="0.01"
                  value={formData.mrp || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })
                  }
                  required
                  disabled={isReadOnly}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })
                  }
                  required
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">Low Stock Threshold *</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  value={formData.lowStockThreshold || 10}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lowStockThreshold: parseFloat(e.target.value) || 10,
                    })
                  }
                  required
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderPoint">Reorder Point *</Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  value={formData.reorderPoint || 5}
                  onChange={(e) =>
                    setFormData({ ...formData, reorderPoint: parseFloat(e.target.value) || 5 })
                  }
                  required
                  disabled={isReadOnly}
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive ?? true}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked as boolean })
                  }
                  disabled={isReadOnly}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Active
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDiscontinued"
                  checked={formData.isDiscontinued ?? false}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isDiscontinued: checked as boolean })
                  }
                  disabled={isReadOnly}
                />
                <Label htmlFor="isDiscontinued" className="cursor-pointer">
                  Discontinued
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {mode === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {mode !== 'view' && (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

