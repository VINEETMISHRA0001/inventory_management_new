'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/constants';
import type { RootState } from '@/store/store';

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
 * Only fetches when user is authenticated to prevent 401 errors.
 */
export function useWarehouses() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch warehouses if user is authenticated
    if (isAuthenticated) {
      fetchWarehouses();
    } else {
      // If not authenticated, set loading to false and clear warehouses
      setIsLoading(false);
      setWarehouses([]);
      setError(null);
    }
  }, [isAuthenticated]);

  const fetchWarehouses = async () => {
    // Don't fetch if not authenticated
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get(API_ENDPOINTS.WAREHOUSES.BASE);
      setWarehouses(response.data.warehouses || []);
    } catch (err: any) {
      // Only set error if it's not a 401 (unauthorized) - those are expected when not logged in
      if (err.message !== 'Unauthorized' && !err.message.includes('401')) {
        setError(err.message || 'Failed to fetch warehouses');
        console.error('Failed to fetch warehouses:', err);
      }
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

