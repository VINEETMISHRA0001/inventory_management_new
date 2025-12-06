'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Filter,
  Tag,
  Building2,
  Package,
  DollarSign,
  Boxes,
  CheckCircle2,
  XCircle,
  TrendingDown,
  RotateCcw,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/constants';

export interface ProductFilters {
  brands?: string[];
  categories?: string[];
  productTypes?: string[];
  status?: 'active' | 'inactive' | 'discontinued' | 'lowStock';
  minPrice?: number;
  maxPrice?: number;
  minQuantity?: number;
  maxQuantity?: number;
}

interface ProductsMegaFilterProps {
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
}

interface FilterOptions {
  brands: string[];
  categories: string[];
  productTypes: string[];
}

export function ProductsMegaFilter({
  filters,
  onFiltersChange,
}: ProductsMegaFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    brands: [],
    categories: [],
    productTypes: [],
  });
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [localFilters, setLocalFilters] = useState<ProductFilters>(filters);

  // Fetch filter options from backend
  useEffect(() => {
    const fetchFilterOptions = async () => {
      setLoadingOptions(true);
      try {
        const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BASE, {
          params: { limit: 1000 }, // Get all products to extract unique values
        });
        const products = response.data.products || [];

        const brands = Array.from(
          new Set(products.map((p: any) => p.brand).filter(Boolean))
        ).sort() as string[];
        const categories = Array.from(
          new Set(products.map((p: any) => p.category).filter(Boolean))
        ).sort() as string[];
        const productTypes = Array.from(
          new Set(products.map((p: any) => p.productType).filter(Boolean))
        ).sort() as string[];

        setFilterOptions({ brands, categories, productTypes });
      } catch (error) {
        console.error('Failed to fetch filter options:', error);
      } finally {
        setLoadingOptions(false);
      }
    };

    if (isOpen) {
      fetchFilterOptions();
    }
  }, [isOpen]);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof ProductFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    const clearedFilters: ProductFilters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    setIsOpen(false);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.brands && filters.brands.length > 0) count++;
    if (filters.categories && filters.categories.length > 0) count++;
    if (filters.productTypes && filters.productTypes.length > 0) count++;
    if (filters.status) count++;
    if (filters.minPrice || filters.maxPrice) count++;
    if (filters.minQuantity || filters.maxQuantity) count++;
    return count;
  };

  const activeCount = getActiveFiltersCount();

  return (
    <>
      <Button
        variant="outline"
        size="default"
        className="shadow-sm"
        onClick={() => setIsOpen(true)}
      >
        <Filter className="size-4 mr-2" />
        Filters
        {activeCount > 0 && (
          <Badge
            variant="secondary"
            className="ml-2 h-5 min-w-5 rounded-full px-1.5 text-xs"
          >
            {activeCount}
          </Badge>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
              <Filter className="size-5" />
              Filter Products
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">

            {/* Quick Filters Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Brand Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <Building2 className="size-4 text-muted-foreground" />
                  Brand
                </Label>
                <Select
                  value={localFilters.brands?.[0] || 'all'}
                  onValueChange={(value) =>
                    handleFilterChange('brands', value === 'all' ? [] : [value])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {loadingOptions ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Loading...
                      </div>
                    ) : (
                      filterOptions.brands.map((brand) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <Tag className="size-4 text-muted-foreground" />
                  Category
                </Label>
                <Select
                  value={localFilters.categories?.[0] || 'all'}
                  onValueChange={(value) =>
                    handleFilterChange('categories', value === 'all' ? [] : [value])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {loadingOptions ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Loading...
                      </div>
                    ) : (
                      filterOptions.categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Type Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <Package className="size-4 text-muted-foreground" />
                  Product Type
                </Label>
                <Select
                  value={localFilters.productTypes?.[0] || 'all'}
                  onValueChange={(value) =>
                    handleFilterChange('productTypes', value === 'all' ? [] : [value])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {loadingOptions ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Loading...
                      </div>
                    ) : (
                      filterOptions.productTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="size-4 text-muted-foreground" />
                  Status
                </Label>
                <Select
                  value={localFilters.status || 'all'}
                  onValueChange={(value) =>
                    handleFilterChange('status', value === 'all' ? undefined : value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-green-600" />
                        Active
                      </div>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <div className="flex items-center gap-2">
                        <XCircle className="size-4 text-gray-500" />
                        Inactive
                      </div>
                    </SelectItem>
                    <SelectItem value="discontinued">
                      <div className="flex items-center gap-2">
                        <XCircle className="size-4 text-red-600" />
                        Discontinued
                      </div>
                    </SelectItem>
                    <SelectItem value="lowStock">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="size-4 text-orange-600" />
                        Low Stock
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Price Range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <DollarSign className="size-4 text-muted-foreground" />
                Price Range (MRP)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-normal">
                    Minimum Price
                  </Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={localFilters.minPrice || ''}
                    onChange={(e) =>
                      handleFilterChange(
                        'minPrice',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-normal">
                    Maximum Price
                  </Label>
                  <Input
                    type="number"
                    placeholder="No limit"
                    value={localFilters.maxPrice || ''}
                    onChange={(e) =>
                      handleFilterChange(
                        'maxPrice',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Quantity Range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Boxes className="size-4 text-muted-foreground" />
                Quantity Range
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-normal">
                    Minimum Quantity
                  </Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={localFilters.minQuantity || ''}
                    onChange={(e) =>
                      handleFilterChange(
                        'minQuantity',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-normal">
                    Maximum Quantity
                  </Label>
                  <Input
                    type="number"
                    placeholder="No limit"
                    value={localFilters.maxQuantity || ''}
                    onChange={(e) =>
                      handleFilterChange(
                        'maxQuantity',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              size="default"
              onClick={handleClearFilters}
              className="gap-2"
            >
              <RotateCcw className="size-4" />
              Clear All
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="default"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button size="default" onClick={handleApplyFilters}>
                Apply Filters
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

