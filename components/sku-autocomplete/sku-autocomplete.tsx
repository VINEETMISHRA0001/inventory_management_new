"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  mrp?: number;
  price?: number;
  productType?: string;
}

interface SkuAutocompleteProps {
  value: string;
  onChange: (sku: string, product?: Product) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SkuAutocomplete({
  value,
  onChange,
  placeholder = "e.g., S2020181FG",
  required = false,
  disabled = false,
  className,
}: SkuAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // Debounce search
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get<{
          products: Product[];
          pagination: unknown;
        }>(API_ENDPOINTS.PRODUCTS.BASE, {
          params: {
            search: value,
            limit: 10,
            page: 1,
          },
        });

        const filteredProducts = response.data.products
          .filter((product) =>
            product.sku.toLowerCase().includes(value.toLowerCase())
          )
          .map((product: any) => ({
            id: product.id,
            sku: product.sku,
            name: product.name,
            quantity: product.quantity || 0,
            mrp: product.mrp || 0,
            price: product.price || product.sellingPrice || 0,
            productType: product.productType || "",
          }));

        setSuggestions(filteredProducts);
        // Open dropdown if there are suggestions and input is focused
        if (filteredProducts.length > 0) {
          setIsOpen(true);
        } else {
          setIsOpen(false);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value]);

  const handleSelect = (product: Product) => {
    onChange(product.sku, product);
    setIsOpen(false);
    setSuggestions([]);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleBlur = () => {
    // Delay to allow click events on suggestions
    setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setSelectedIndex(-1);
        }}
        onFocus={() => {
          if (suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={className}
      />
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md">
          <div className="max-h-60 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : suggestions.length > 0 ? (
              <ul className="py-1">
                {suggestions.map((product, index) => (
                  <li
                    key={product.id}
                    className={cn(
                      "cursor-pointer px-4 py-2 text-sm hover:bg-accent",
                      selectedIndex === index && "bg-accent"
                    )}
                    onClick={() => handleSelect(product)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="font-medium">{product.sku}</div>
                    <div className="text-xs text-muted-foreground">
                      {product.name}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                No products found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
