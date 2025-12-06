export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export interface SocialAuthProvider {
  id: string;
  name: string;
  icon?: React.ReactNode;
}

export type FormFieldType = 'email' | 'password' | 'text' | 'number' | 'tel';

export interface FormFieldProps {
  id: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export interface MenuItem {
  title: string;
  url: string;
  icon: string;
  badge?: string;
  children?: MenuItem[];
}

export interface ProductFormData {
  sku: string;
  name: string;
  hsnCode?: string;
  brand: string;
  category: string;
  productType: string;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  reorderPoint: number;
  isActive: boolean;
  isDiscontinued: boolean;
  dimensions?: string;
  colors?: string[];
  collection?: string;
  size?: string;
  finish?: string;
  grade?: string;
  boxCoverage?: string;
  batch?: string;
  designType?: string;
  series?: string;
  material?: string;
  warrantyInfo?: string;
}
