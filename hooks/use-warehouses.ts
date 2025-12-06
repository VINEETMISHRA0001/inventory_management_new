'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/constants';

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  manager: string;
  isActive: boolean;
}

/**
 * Custom hook to fetch and manage warehouses.
 * Provides warehouses data and loading state for use across the application.
 */
export function useWarehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get(API_ENDPOINTS.WAREHOUSES.BASE);
      setWarehouses(response.data.warehouses || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch warehouses');
      console.error('Failed to fetch warehouses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    warehouses,
    isLoading,
    error,
    refetch: fetchWarehouses,
  };
}

