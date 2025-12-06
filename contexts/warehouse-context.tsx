'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWarehouses, type Warehouse } from '@/hooks/use-warehouses';

interface WarehouseContextType {
  selectedWarehouse: Warehouse | null;
  setSelectedWarehouse: (warehouse: Warehouse | null) => void;
  warehouses: Warehouse[];
  isLoading: boolean;
}

const WarehouseContext = createContext<WarehouseContextType | undefined>(undefined);

const WAREHOUSE_STORAGE_KEY = 'selected_warehouse';

/**
 * WarehouseProvider manages the selected warehouse across the application.
 * Persists selection in localStorage and provides it to all child components.
 */
export function WarehouseProvider({ children }: { children: ReactNode }) {
  const { warehouses, isLoading } = useWarehouses();
  const [selectedWarehouse, setSelectedWarehouseState] = useState<Warehouse | null>(null);

  useEffect(() => {
    if (!isLoading && warehouses.length > 0 && !selectedWarehouse) {
      const stored = localStorage.getItem(WAREHOUSE_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const found = warehouses.find((w) => w.id === parsed.id);
          if (found) {
            setSelectedWarehouseState(found);
            return;
          }
        } catch {
          // Invalid stored data
        }
      }
      // Default to first warehouse if none selected
      setSelectedWarehouseState(warehouses[0]);
    }
  }, [warehouses, isLoading, selectedWarehouse]);

  const setSelectedWarehouse = (warehouse: Warehouse | null) => {
    setSelectedWarehouseState(warehouse);
    if (warehouse) {
      localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify({ id: warehouse.id }));
    } else {
      localStorage.removeItem(WAREHOUSE_STORAGE_KEY);
    }
  };

  return (
    <WarehouseContext.Provider
      value={{
        selectedWarehouse,
        setSelectedWarehouse,
        warehouses,
        isLoading,
      }}
    >
      {children}
    </WarehouseContext.Provider>
  );
}

export function useWarehouseContext() {
  const context = useContext(WarehouseContext);
  if (context === undefined) {
    throw new Error('useWarehouseContext must be used within a WarehouseProvider');
  }
  return context;
}


