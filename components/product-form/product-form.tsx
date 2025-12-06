'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { PRODUCT_CATEGORIES, PRODUCT_STOCK_TYPES, DEFAULT_BRAND } from '@/lib/constants';
import type { Product } from '@/store/slices/productsSlice';

interface ProductFormProps {
  product?: Product | null;
  mode: 'view' | 'edit' | 'create';
  onSave?: (product: Partial<Product>) => Promise<void>;
  onCancel?: () => void;
}

/**
 * ProductForm component handles viewing, editing, and creating products in a sidebar.
 * Supports CERA-specific product categories and metadata fields with beautiful styling.
 */
export function ProductForm({ product, mode, onSave, onCancel }: ProductFormProps) {
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
    availableTillStocksLast: false,
    colors: [],
    certifications: [],
    features: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [colorInput, setColorInput] = useState('');
  const [certificationInput, setCertificationInput] = useState('');
  const [featureInput, setFeatureInput] = useState('');

  useEffect(() => {
    if (product && mode !== 'create') {
      setFormData({
        ...product,
        colors: product.colors || [],
        certifications: product.certifications || [],
        features: product.features || [],
      });
      setColorInput('');
      setCertificationInput('');
      setFeatureInput('');
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
        availableTillStocksLast: false,
        colors: [],
        certifications: [],
        features: [],
      });
      setColorInput('');
      setCertificationInput('');
      setFeatureInput('');
    }
  }, [product, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view' || !onSave) return;

    setIsLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isReadOnly = mode === 'view';

  const addColor = () => {
    if (colorInput.trim()) {
      setFormData({
        ...formData,
        colors: [...(formData.colors || []), colorInput.trim()],
      });
      setColorInput('');
    }
  };

  const removeColor = (index: number) => {
    const newColors = [...(formData.colors || [])];
    newColors.splice(index, 1);
    setFormData({ ...formData, colors: newColors });
  };

  const addCertification = () => {
    if (certificationInput.trim()) {
      setFormData({
        ...formData,
        certifications: [...(formData.certifications || []), certificationInput.trim()],
      });
      setCertificationInput('');
    }
  };

  const removeCertification = (index: number) => {
    const newCerts = [...(formData.certifications || [])];
    newCerts.splice(index, 1);
    setFormData({ ...formData, certifications: newCerts });
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...(formData.features || []), featureInput.trim()],
      });
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    const newFeatures = [...(formData.features || [])];
    newFeatures.splice(index, 1);
    setFormData({ ...formData, features: newFeatures });
  };

  const isTiles = formData.category === PRODUCT_CATEGORIES.TILES;
  const isSanitaryware = formData.category === PRODUCT_CATEGORIES.SANITARYWARE;
  const isFaucets = formData.category === PRODUCT_CATEGORIES.FAUCETS;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU / Product Code *</Label>
              <Input
                id="sku"
                value={formData.sku || ''}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g., S2020181FG"
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
                placeholder="e.g., CARMONA"
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
                placeholder="e.g., CERA, Cera Luxe"
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
                placeholder="e.g., Table Top Wash Basin"
                required
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productCodeSeries">Product Code Series</Label>
              <Input
                id="productCodeSeries"
                value={formData.productCodeSeries || ''}
                onChange={(e) => setFormData({ ...formData, productCodeSeries: e.target.value })}
                placeholder="e.g., S2020181"
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="collection">Collection</Label>
              <Input
                id="collection"
                value={formData.collection || ''}
                onChange={(e) => setFormData({ ...formData, collection: e.target.value })}
                placeholder="e.g., Lustre Collection"
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
                  <SelectValue placeholder="Select stock type" />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dimensions">Dimensions</Label>
              <Input
                id="dimensions"
                value={formData.dimensions || ''}
                onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                placeholder="e.g., 490x390x110 mm"
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productStructure">Product Structure</Label>
              <Select
                value={formData.productStructure || ''}
                onValueChange={(value) => setFormData({ ...formData, productStructure: value })}
                disabled={isReadOnly}
              >
                <SelectTrigger id="productStructure">
                  <SelectValue placeholder="Select structure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standalone">Standalone</SelectItem>
                  <SelectItem value="modular">Modular</SelectItem>
                  <SelectItem value="set">Set</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isTiles && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Input
                  id="size"
                  value={formData.size || ''}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  placeholder="e.g., 600x600 mm"
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="finish">Finish</Label>
                <Input
                  id="finish"
                  value={formData.finish || ''}
                  onChange={(e) => setFormData({ ...formData, finish: e.target.value })}
                  placeholder="e.g., Glossy, Matte"
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  value={formData.grade || ''}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder="e.g., Premium, Standard"
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="boxCoverage">Box Coverage</Label>
                <Input
                  id="boxCoverage"
                  value={formData.boxCoverage || ''}
                  onChange={(e) => setFormData({ ...formData, boxCoverage: e.target.value })}
                  placeholder="e.g., 1.44 sq ft"
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch">Batch</Label>
                <Input
                  id="batch"
                  value={formData.batch || ''}
                  onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                  placeholder="e.g., BATCH001"
                  disabled={isReadOnly}
                />
              </div>
            </div>
          )}

          {isSanitaryware && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="designType">Design Type</Label>
                <Input
                  id="designType"
                  value={formData.designType || ''}
                  onChange={(e) => setFormData({ ...formData, designType: e.target.value })}
                  placeholder="e.g., Modern, Classic"
                  disabled={isReadOnly}
                />
              </div>
            </div>
          )}

          {isFaucets && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="series">Series</Label>
                <Input
                  id="series"
                  value={formData.series || ''}
                  onChange={(e) => setFormData({ ...formData, series: e.target.value })}
                  placeholder="e.g., Premium Series"
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="material">Material</Label>
                <Input
                  id="material"
                  value={formData.material || ''}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  placeholder="e.g., Brass, Chrome"
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="warrantyInfo">Warranty Info</Label>
                <Input
                  id="warrantyInfo"
                  value={formData.warrantyInfo || ''}
                  onChange={(e) => setFormData({ ...formData, warrantyInfo: e.target.value })}
                  placeholder="e.g., 5 years warranty"
                  disabled={isReadOnly}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="colors">Colors</Label>
            <div className="flex gap-2">
              <Input
                id="colors"
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addColor();
                  }
                }}
                placeholder="Enter color and press Enter"
                disabled={isReadOnly}
              />
              {!isReadOnly && (
                <Button type="button" onClick={addColor} variant="outline" className="h-10">
                  Add
                </Button>
              )}
            </div>
            {formData.colors && formData.colors.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.colors.map((color, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {color}
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => removeColor(index)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="compatibility">Compatibility</Label>
            <Input
              id="compatibility"
              value={formData.compatibility || ''}
              onChange={(e) => setFormData({ ...formData, compatibility: e.target.value })}
              placeholder="e.g., Compatible with standard fittings"
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="variants_description">Variants Description</Label>
            <Input
              id="variants_description"
              value={formData.variants_description || ''}
              onChange={(e) => setFormData({ ...formData, variants_description: e.target.value })}
              placeholder="e.g., 490x390x110 mm"
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="certifications">Certifications</Label>
            <div className="flex gap-2">
              <Input
                id="certifications"
                value={certificationInput}
                onChange={(e) => setCertificationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCertification();
                  }
                }}
                placeholder="Enter certification and press Enter"
                disabled={isReadOnly}
              />
              {!isReadOnly && (
                <Button type="button" onClick={addCertification} variant="outline" className="h-10">
                  Add
                </Button>
              )}
            </div>
            {formData.certifications && formData.certifications.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.certifications.map((cert, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {cert}
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => removeCertification(index)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="features">Features</Label>
            <div className="flex gap-2">
              <Input
                id="features"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addFeature();
                  }
                }}
                placeholder="Enter feature and press Enter"
                disabled={isReadOnly}
              />
              {!isReadOnly && (
                <Button type="button" onClick={addFeature} variant="outline" className="h-10">
                  Add
                </Button>
              )}
            </div>
            {formData.features && formData.features.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.features.map((feature, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {feature}
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about the product..."
              rows={3}
              disabled={isReadOnly}
            />
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
                placeholder="e.g., 9339.80"
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
                placeholder="e.g., 13940"
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
                placeholder="e.g., 13940"
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
                placeholder="e.g., 100"
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
                placeholder="e.g., 10"
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
                placeholder="e.g., 5"
                required
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
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
            <div className="flex items-center space-x-2">
              <Checkbox
                id="availableTillStocksLast"
                checked={formData.availableTillStocksLast ?? false}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, availableTillStocksLast: checked as boolean })
                }
                disabled={isReadOnly}
              />
              <Label htmlFor="availableTillStocksLast" className="cursor-pointer">
                Available Till Stocks Last
              </Label>
            </div>
          </div>
        </div>
      </div>

      {mode !== 'view' && (
        <div className="border-t p-6 flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-10">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1 h-10">
            {isLoading ? 'Saving...' : mode === 'create' ? 'Create Product' : 'Save Changes'}
          </Button>
        </div>
      )}
    </form>
  );
}

