import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/constants';
import type { ProductFilters } from '@/components/products-mega-filter';

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  productType: string;
  quantity: number;
  mrp: number;
  purchasePrice: number;
  sellingPrice: number;
  lowStockThreshold: number;
  reorderPoint: number;
  isActive: boolean;
  isDiscontinued: boolean;
  unit: string;
  dimensions?: string;
  colors?: string[];
  collection?: string;
  availableTillStocksLast?: boolean;
  certifications?: string[];
  compatibility?: string;
  features?: string[];
  finish?: string;
  notes?: string;
  productCodeSeries?: string;
  productStructure?: string;
  variants_description?: string;
  size?: string;
  grade?: string;
  boxCoverage?: string;
  batch?: string;
  designType?: string;
  series?: string;
  material?: string;
  warrantyInfo?: string;
}

interface ProductsState {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  error: string | null;
  search: string;
  filters: ProductFilters;
}

const initialState: ProductsState = {
  products: [],
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  },
  isLoading: false,
  error: null,
  search: '',
  filters: {},
};

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (params: { page?: number; limit?: number; search?: string; filters?: ProductFilters }) => {
    const filterParams: Record<string, string> = {};
    
    if (params.filters?.brands && params.filters.brands.length > 0) {
      filterParams.brands = params.filters.brands.join(',');
    }
    if (params.filters?.categories && params.filters.categories.length > 0) {
      filterParams.categories = params.filters.categories.join(',');
    }
    if (params.filters?.productTypes && params.filters.productTypes.length > 0) {
      filterParams.productTypes = params.filters.productTypes.join(',');
    }
    if (params.filters?.status) {
      filterParams.status = params.filters.status;
    }
    if (params.filters?.minPrice !== undefined) {
      filterParams.minPrice = params.filters.minPrice.toString();
    }
    if (params.filters?.maxPrice !== undefined) {
      filterParams.maxPrice = params.filters.maxPrice.toString();
    }
    if (params.filters?.minQuantity !== undefined) {
      filterParams.minQuantity = params.filters.minQuantity.toString();
    }
    if (params.filters?.maxQuantity !== undefined) {
      filterParams.maxQuantity = params.filters.maxQuantity.toString();
    }

    const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BASE, {
      params: {
        page: params.page,
        limit: params.limit,
        search: params.search,
        ...filterParams,
      },
    });
    return response.data;
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setSearch: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    setFilters: (state, action: PayloadAction<ProductFilters>) => {
      state.filters = action.payload;
      state.pagination.page = 1; // Reset to first page when filters change
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products = action.payload.products;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch products';
      });
  },
});

export const { setSearch, setPage, setFilters } = productsSlice.actions;
export default productsSlice.reducer;


