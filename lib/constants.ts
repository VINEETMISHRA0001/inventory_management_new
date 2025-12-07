export const APP_PATHS = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/dashboard',
  PRODUCTS: '/dashboard/products',
  WAREHOUSES: '/dashboard/warehouses',
  STOCK_MANAGEMENT: '/dashboard/stock',
  STOCK_MOVEMENT_LOGS: '/dashboard/stock/movement-logs',
  STOCK_IN: '/dashboard/stock/in',
  STOCK_IN_HISTORY: '/dashboard/stock/in/history',
  STOCK_OUT: '/dashboard/stock/out',
  STOCK_OUT_HISTORY: '/dashboard/stock/out/history',
  STOCK_TRANSFER: '/dashboard/stock/transfer',
  STOCK_TRANSFER_HISTORY: '/dashboard/stock/transfer/history',
  STOCK_DAMAGE: '/dashboard/stock/damage',
  STOCK_DAMAGE_HISTORY: '/dashboard/stock/damage/history',
  STOCK_ADJUSTMENT: '/dashboard/stock/adjustment',
  STOCK_ADJUSTMENT_HISTORY: '/dashboard/stock/adjustment/history',
  STOCK_RETURN: '/dashboard/stock/return',
  STOCK_RETURN_HISTORY: '/dashboard/stock/return/history',
  STOCK_SUPPLIER_RETURN: '/dashboard/stock/supplier-return',
  STOCK_SUPPLIER_RETURN_HISTORY: '/dashboard/stock/supplier-return/history',
  STOCK_EXCHANGE: '/dashboard/stock/exchange',
  STOCK_EXCHANGE_HISTORY: '/dashboard/stock/exchange/history',
  QUOTATIONS: '/dashboard/quotations',
  QUOTATION_CREATE: '/dashboard/quotations/create',
  QUOTATION_VIEW: (id: string) => `/dashboard/quotations/${id}`,
  ORDERS: '/dashboard/orders',
  CUSTOMERS: '/dashboard/customers',
  ANALYTICS: '/dashboard/analytics',
  SETTINGS: '/dashboard/settings',
} as const;

export const APP_CONFIG = {
  COMPANY_NAME: 'Acme Inc.',
  APP_NAME: 'Inventory Management',
  LOGO_ICON: 'GalleryVerticalEnd',
} as const;

export const SOCIAL_AUTH_PROVIDERS = {
  GITHUB: 'github',
  GOOGLE: 'google',
} as const;

export const FORM_PLACEHOLDERS = {
  EMAIL: 'm@example.com',
  PASSWORD: 'Enter your password',
} as const;

export const FORM_MESSAGES = {
  LOGIN_TITLE: 'Login to your account',
  LOGIN_DESCRIPTION: 'Enter your email below to login to your account',
  FORGOT_PASSWORD: 'Forgot your password?',
  CONTINUE_WITH: 'Or continue with',
  NO_ACCOUNT: "Don't have an account?",
  SIGN_UP: 'Sign up',
} as const;

export const SIDEBAR_CONFIG = {
  WIDTH: 'calc(var(--spacing) * 72)',
  HEADER_HEIGHT: 'calc(var(--spacing) * 12)',
} as const;

import type { MenuItem } from './types';

export const MENU_ITEMS: MenuItem[] = [
  {
    title: 'Dashboard',
    url: APP_PATHS.DASHBOARD,
    icon: 'LayoutDashboard',
  },
  {
    title: 'Products',
    url: APP_PATHS.PRODUCTS,
    icon: 'Box',
  },
  {
    title: 'Stock Management',
    url: APP_PATHS.STOCK_MANAGEMENT,
    icon: 'Package',
    children: [
      {
        title: 'Stock Overview',
        url: APP_PATHS.STOCK_MANAGEMENT,
        icon: 'BarChart3',
      },
      {
        title: 'Stock In (GRN)',
        url: APP_PATHS.STOCK_IN,
        icon: 'ArrowDownCircle',
      },
      {
        title: 'Stock Out (Sale)',
        url: APP_PATHS.STOCK_OUT,
        icon: 'ArrowUpCircle',
      },
      {
        title: 'Damage/Breakage',
        url: APP_PATHS.STOCK_DAMAGE,
        icon: 'AlertTriangle',
      },
      // {
      //   title: 'Stock Transfer',
      //   url: APP_PATHS.STOCK_TRANSFER,
      //   icon: 'ArrowLeftRight',
      // },
      // {
      //   title: 'Adjustment',
      //   url: APP_PATHS.STOCK_ADJUSTMENT,
      //   icon: 'Edit',
      // },
      // {
      //   title: 'Customer Return',
      //   url: APP_PATHS.STOCK_RETURN,
      //   icon: 'RotateCcw',
      // },
      // {
      //   title: 'Supplier Return',
      //   url: APP_PATHS.STOCK_SUPPLIER_RETURN,
      //   icon: 'Truck',
      // },
      // {
      //   title: 'Exchange',
      //   url: APP_PATHS.STOCK_EXCHANGE,
      //   icon: 'RefreshCw',
      // },
    ],
  },
  {
    title: 'Quotations',
    url: APP_PATHS.QUOTATIONS,
    icon: 'FileText',
  },
  {
    title: 'Warehouses',
    url: APP_PATHS.WAREHOUSES,
    icon: 'Warehouse',
  },
] as const;

export const PRODUCT_CATEGORIES = {
  TILES: 'Tiles',
  SANITARYWARE: 'Sanitaryware',
  FAUCETS: 'Faucets',
  ACCESSORIES: 'Accessories',
} as const;

export const PRODUCT_STOCK_TYPES = {
  UNIT: 'Unit',
  BOX: 'Box',
  PIECE: 'Piece',
  SQUARE_FEET: 'Square Feet',
} as const;

export const DEFAULT_BRAND = 'CERA';

export const STORAGE_KEYS = {
  AUTH_USER: 'auth_user',
  AUTH_TOKEN: 'auth_token',
  REMEMBER_ME: 'remember_me',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    CHANGE_PASSWORD: '/api/auth/change-password',
    INIT_ADMIN: '/api/auth/init-admin',
    RESET_ADMIN_PASSWORD: '/api/auth/reset-admin-password',
  },
  PRODUCTS: {
    BASE: '/api/products',
    STATS: '/api/products/stats',
    UPLOAD: '/api/products/upload',
    BULK: '/api/products/bulk',
    BY_ID: (id: string) => `/api/products/${id}`,
  },
  WAREHOUSES: {
    BASE: '/api/warehouses',
    BY_ID: (id: string) => `/api/warehouses/${id}`,
  },
  STOCK: {
    IN: '/api/stock/in',
    OUT: '/api/stock/out',
    TRANSFER: '/api/stock/transfer',
    DAMAGE: '/api/stock/damage',
    ADJUSTMENT: '/api/stock/adjustment',
    RETURN: '/api/stock/return',
    SUPPLIER_RETURN: '/api/stock/supplier-return',
    EXCHANGE: '/api/stock/exchange',
    OVERVIEW: '/api/stock/overview',
    WAREHOUSE_DISTRIBUTION: '/api/stock/warehouse-distribution',
    OPERATIONS: '/api/stock/operations',
    MOVEMENT_LOG: '/api/stock/movement-log',
  },
  QUOTATIONS: {
    BASE: '/api/quotations',
    BY_ID: (id: string) => `/api/quotations/${id}`,
    GENERATE_BILL: (id: string) => `/api/quotations/${id}/bill`,
    APPROVE: (id: string) => `/api/quotations/${id}/approve`,
    REJECT: (id: string) => `/api/quotations/${id}/reject`,
  },
  NOTIFICATIONS: {
    BASE: '/api/notifications',
    BY_ID: (id: string) => `/api/notifications/${id}`,
    MARK_ALL_READ: '/api/notifications/mark-all-read',
  },
} as const;

export const API_BASE_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_API_URL || '';
