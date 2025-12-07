"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format,
  isToday,
  isYesterday,
  differenceInDays,
  formatDistanceToNow,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Package,
  Search,
  FileX,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";

interface TodayMovement {
  sku: string;
  productName: string;
  productType: string;
  stockIn: number;
  stockOut: number;
  nettStock: number;
  lastUpdated?: string | null;
}

interface TodayMovementsResponse {
  date: string;
  movements: TodayMovement[];
}

interface MovementLogEntry {
  date: string;
  stockIn: number;
  stockOut: number;
  netStock: number;
  operationType?: string;
  operationId?: string;
  timestamp?: string;
}

interface MovementLogResponse {
  sku: string;
  productName: string;
  currentStock: number;
  movements: MovementLogEntry[];
}

export function StockMovementAnalytics() {
  const [data, setData] = useState<TodayMovementsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [movementLog, setMovementLog] = useState<MovementLogResponse | null>(
    null
  );
  const [isLoadingLog, setIsLoadingLog] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  const fetchMovements = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setHasError(false);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const response = await apiClient.get<TodayMovementsResponse>(
          `${API_ENDPOINTS.STOCK.TODAY_MOVEMENTS}?date=${dateStr}`
        );
        setData(response.data);
      } catch (error: any) {
        console.error("Failed to fetch movements:", error);
        setHasError(true);
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        setData({ date: dateStr, movements: [] });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedDate]
  );

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  // Auto-refresh every 30 seconds when viewing today
  useEffect(() => {
    if (!isToday(selectedDate)) return;

    const interval = setInterval(() => {
      fetchMovements(true);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [selectedDate, fetchMovements]);

  // Refresh on window focus when viewing today
  useEffect(() => {
    if (!isToday(selectedDate)) return;

    const handleFocus = () => {
      fetchMovements(true);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [selectedDate, fetchMovements]);

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    newDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Allow going forward if the new date is today or earlier
    if (newDate.getTime() <= today.getTime()) {
      setSelectedDate(newDate);
    }
  };

  const getDateLabel = (date: Date): { relative: string; actual: string } => {
    const actualDate = format(date, "dd MMMM yyyy");

    if (isToday(date)) {
      return { relative: "Today", actual: actualDate };
    } else if (isYesterday(date)) {
      return { relative: "Yesterday", actual: actualDate };
    } else {
      const daysDiff = differenceInDays(new Date(), date);
      if (daysDiff <= 7) {
        return { relative: `${daysDiff} days ago`, actual: actualDate };
      } else {
        return { relative: actualDate, actual: actualDate };
      }
    }
  };

  const canGoNext = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    // Allow going forward if selected date is before today
    return selected.getTime() < today.getTime();
  };

  const canGoPrevious = () => {
    // Disable previous button if there's an error or if we're at a reasonable limit
    // You can adjust this logic based on your business requirements
    // For now, we'll allow going back indefinitely, but you might want to set a limit
    return !hasError;
  };

  const handleSkuClick = useCallback(async (sku: string) => {
    setSelectedSku(sku);
    setIsModalOpen(true);
    setIsLoadingLog(true);
    setLogError(null);
    setMovementLog(null);

    try {
      // Fetch all movement logs for this SKU (no date filter)
      const response = await apiClient.get<MovementLogResponse>(
        `${API_ENDPOINTS.STOCK.MOVEMENT_LOG}?sku=${sku}`
      );

      // Sort by timestamp (latest first) - the API already sorts, but ensure it
      const sortedMovements = [...(response.data.movements || [])].sort(
        (a, b) => {
          const timestampA = a.timestamp
            ? new Date(a.timestamp).getTime()
            : new Date(a.date).getTime();
          const timestampB = b.timestamp
            ? new Date(b.timestamp).getTime()
            : new Date(b.date).getTime();
          return timestampB - timestampA; // Descending order (newest first)
        }
      );

      setMovementLog({
        ...response.data,
        movements: sortedMovements,
      });
    } catch (error: any) {
      console.error("Failed to fetch movement log:", error);
      const errorMessage = error?.message || "Failed to fetch movement log";
      if (
        errorMessage.includes("Product not found") ||
        errorMessage.includes("not found")
      ) {
        setLogError("Product not found");
      } else {
        setLogError("Failed to load movement logs. Please try again.");
      }
      setMovementLog(null);
    } finally {
      setIsLoadingLog(false);
    }
  }, []);

  const formatOperationType = (type?: string): string => {
    if (!type) return "Unknown";
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDateTime = (timestamp?: string, date?: string): string => {
    if (timestamp) {
      const dateObj = new Date(timestamp);
      return format(dateObj, "dd MMM yyyy, hh:mm a");
    }
    if (date) {
      const dateObj = new Date(date);
      return format(dateObj, "dd MMM yyyy");
    }
    return "N/A";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Stock Movement Log</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousDay}
              disabled={!canGoPrevious()}
              className="h-8 w-8"
              title="Previous day"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-[200px] text-center">
              <div className="text-sm font-medium">
                {getDateLabel(selectedDate).relative}
              </div>
              <div className="text-xs text-muted-foreground">
                {getDateLabel(selectedDate).actual}
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextDay}
              disabled={!canGoNext()}
              className="h-8 w-8"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchMovements(true)}
              disabled={isRefreshing}
              className="h-8 w-8 ml-2"
              title="Refresh"
            >
              <RefreshCw
                className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product SKU</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Stock In</TableHead>
                  <TableHead className="text-right">Stock Out</TableHead>
                  <TableHead className="text-right">Nett Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.movements && data.movements.length > 0 ? (
                  data.movements.map((movement) => (
                    <TableRow
                      key={movement.sku}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSkuClick(movement.sku)}
                    >
                      <TableCell className="font-mono text-sm">
                        {movement.sku}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {movement.productName || "-"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {movement.productType || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {movement.stockIn > 0 ? (
                          <span className="text-green-600 font-medium">
                            +{movement.stockIn.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {movement.stockOut > 0 ? (
                          <span className="text-red-600 font-medium">
                            -{movement.stockOut.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {movement.nettStock !== 0 ? (
                          <span
                            className={
                              movement.nettStock > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {movement.nettStock > 0 ? "+" : ""}
                            {movement.nettStock.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center">
                        <div className="p-4 rounded-full bg-muted/50 dark:bg-muted/30 inline-block mb-4">
                          <Package className="size-12 text-muted-foreground/50" />
                        </div>
                        <p className="text-lg font-medium text-muted-foreground mb-2">
                          No stock movements found
                        </p>
                        <p className="text-sm text-muted-foreground">
                          No stock movements for{" "}
                          {getDateLabel(selectedDate).relative.toLowerCase()}
                        </p>
                        {hasError && (
                          <p className="text-xs text-destructive mt-2">
                            There was an error loading data. Please try
                            refreshing.
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Movement Log Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            // Reset state when modal is closed
            setSelectedSku(null);
            setMovementLog(null);
            setLogError(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Movement Log - {selectedSku}</DialogTitle>
            <DialogDescription>
              {movementLog?.productName && (
                <span className="block mt-1">{movementLog.productName}</span>
              )}
              {movementLog?.currentStock !== undefined && (
                <span className="block mt-1 text-sm">
                  Current Stock:{" "}
                  <strong>{movementLog.currentStock.toLocaleString()}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {isLoadingLog ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : logError ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="p-4 rounded-full bg-destructive/10 dark:bg-destructive/20 inline-block mb-4">
                {logError.includes("not found") ? (
                  <Search className="size-12 text-destructive" />
                ) : (
                  <AlertCircle className="size-12 text-destructive" />
                )}
              </div>
              <p className="text-xl font-semibold mb-2 text-destructive">
                {logError === "Product not found"
                  ? "Product Not Found"
                  : "Error Loading Data"}
              </p>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                {logError === "Product not found"
                  ? `The product with SKU "${selectedSku}" could not be found. Please verify the SKU and try again.`
                  : logError}
              </p>
            </div>
          ) : movementLog?.movements && movementLog.movements.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead className="text-right">Stock In</TableHead>
                    <TableHead className="text-right">Stock Out</TableHead>
                    <TableHead className="text-right">Net Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementLog.movements.map((entry, index) => (
                    <TableRow
                      key={`${entry.operationId || index}-${
                        entry.timestamp || entry.date
                      }`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>
                            {formatDateTime(entry.timestamp, entry.date)}
                          </span>
                          {entry.timestamp && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(entry.timestamp), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.stockIn > 0 ? (
                          <span className="text-green-600 font-medium">
                            +{entry.stockIn.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.stockOut > 0 ? (
                          <span className="text-red-600 font-medium">
                            -{entry.stockOut.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {entry.netStock.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="p-4 rounded-full bg-muted/50 dark:bg-muted/30 inline-block mb-4">
                <FileX className="size-12 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium text-muted-foreground mb-2">
                No movement logs found
              </p>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                {movementLog?.productName
                  ? `No movement history available for ${movementLog.productName} (${selectedSku}).`
                  : `No movement history available for SKU ${selectedSku}.`}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
