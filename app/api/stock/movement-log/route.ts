import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/stock/movement-log
 * Get stock movement log for a specific product SKU
 * Query params: sku (required), date (optional, format: YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');
    const date = searchParams.get('date'); // Optional: filter by specific date
    const startDate = searchParams.get('startDate'); // Optional: start date for range
    const endDate = searchParams.get('endDate'); // Optional: end date for range

    if (!sku) {
      return NextResponse.json({ error: 'SKU is required' }, { status: 400 });
    }

    const db = await getDatabase();
    const productsCollection = db.collection('products');
    const stockOperationsCollection = db.collection('stock_operations');

    // Find product by SKU
    const product = await productsCollection.findOne({
      sku,
      isDeleted: { $ne: true },
    });

    if (!product) {
      return NextResponse.json(
        {
          error: 'Product not found',
          movements: [],
          currentStock: 0,
        },
        { status: 404 }
      );
    }

    // Build query for stock operations - don't filter by date in query, we'll filter by actual operation date later
    const query: any = {
      'items.sku': sku,
    };

    // Get all stock operations for this SKU (we'll filter by actual operation date in JavaScript)
    const allOperations = await stockOperationsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Build date filter for JavaScript filtering
    let filterStartDate: Date | null = null;
    let filterEndDate: Date | null = null;

    if (date) {
      // Single date filter
      filterStartDate = new Date(date);
      filterStartDate.setHours(0, 0, 0, 0);
      filterEndDate = new Date(date);
      filterEndDate.setHours(23, 59, 59, 999);
    } else if (startDate && endDate) {
      // Date range filter
      filterStartDate = new Date(startDate);
      filterStartDate.setHours(0, 0, 0, 0);
      filterEndDate = new Date(endDate);
      filterEndDate.setHours(23, 59, 59, 999);
    } else if (startDate) {
      // Only start date
      filterStartDate = new Date(startDate);
      filterStartDate.setHours(0, 0, 0, 0);
    } else if (endDate) {
      // Only end date
      filterEndDate = new Date(endDate);
      filterEndDate.setHours(23, 59, 59, 999);
    }

    // Filter operations by their actual operation date (not createdAt)
    const operations = allOperations.filter((op) => {
      // If no date filter, include all operations
      if (!filterStartDate && !filterEndDate) {
        return true;
      }

      // Determine the actual operation date based on operation type
      let operationDate: Date | null = null;

      if (op.type === 'stock_in') {
        operationDate = op.receivedDate ? new Date(op.receivedDate) : null;
      } else if (op.type === 'stock_out') {
        operationDate = op.saleDate ? new Date(op.saleDate) : null;
      } else if (op.type === 'stock_transfer') {
        operationDate = op.transferDate ? new Date(op.transferDate) : null;
      } else if (op.type === 'damage') {
        operationDate = op.damageDate ? new Date(op.damageDate) : null;
      } else if (op.type === 'adjustment') {
        operationDate = op.adjustmentDate ? new Date(op.adjustmentDate) : null;
      } else if (op.type === 'return') {
        operationDate = op.returnDate ? new Date(op.returnDate) : null;
      } else if (op.type === 'exchange') {
        operationDate = op.exchangeDate ? new Date(op.exchangeDate) : null;
      }

      // If operation doesn't have a specific date, skip it (don't use createdAt)
      if (!operationDate) {
        return false;
      }

      // Normalize operation date to start of day for comparison
      const opDate = new Date(operationDate);
      opDate.setHours(0, 0, 0, 0);

      // Check if operation date is within filter range
      if (filterStartDate && filterEndDate) {
        return opDate >= filterStartDate && opDate <= filterEndDate;
      } else if (filterStartDate) {
        return opDate >= filterStartDate;
      } else if (filterEndDate) {
        return opDate <= filterEndDate;
      }

      return true;
    });

    // Get current stock from warehouse_stock
    const warehouseStockCollection = db.collection('warehouse_stock');
    const stockAggregation = await warehouseStockCollection
      .aggregate([
        {
          $match: {
            productId: product._id,
          },
        },
        {
          $group: {
            _id: null,
            totalStock: { $sum: '$quantity' },
          },
        },
      ])
      .toArray();

    const currentStock = stockAggregation[0]?.totalStock || 0;

    // Process operations to create individual movement log entries
    const movements: Array<{
      date: string;
      stockIn: number;
      stockOut: number;
      netStock: number;
      operationType?: string;
      operationId?: string;
      timestamp?: string;
    }> = [];

    // Process each operation individually
    const operationEntries: Array<{
      operation: any;
      operationDate: Date;
      quantity: number;
      stockIn: number;
      stockOut: number;
      operationType: string;
      operationId: string;
    }> = [];

    operations.forEach((op) => {
      let operationDate: Date | null = null;
      let quantity = 0;
      let stockIn = 0;
      let stockOut = 0;

      // Find the item with matching SKU
      const item = op.items?.find((i: any) => i.sku === sku);
      if (!item) return;

      quantity = item.quantity || 0;

      // Determine date based on operation type
      if (op.type === 'stock_in') {
        operationDate = op.receivedDate
          ? new Date(op.receivedDate)
          : new Date(op.createdAt);
      } else if (op.type === 'stock_out') {
        operationDate = op.saleDate
          ? new Date(op.saleDate)
          : new Date(op.createdAt);
      } else if (op.type === 'stock_transfer') {
        operationDate = op.transferDate
          ? new Date(op.transferDate)
          : new Date(op.createdAt);
      } else if (op.type === 'damage') {
        operationDate = op.damageDate
          ? new Date(op.damageDate)
          : new Date(op.createdAt);
      } else if (op.type === 'adjustment') {
        operationDate = op.adjustmentDate
          ? new Date(op.adjustmentDate)
          : new Date(op.createdAt);
      } else if (op.type === 'return') {
        operationDate = op.returnDate
          ? new Date(op.returnDate)
          : new Date(op.createdAt);
      } else if (op.type === 'exchange') {
        operationDate = op.exchangeDate
          ? new Date(op.exchangeDate)
          : new Date(op.createdAt);
      } else {
        operationDate = new Date(op.createdAt);
      }

      if (!operationDate) return;

      // Determine stock in/out based on operation type
      if (
        op.type === 'stock_in' ||
        (op.type === 'adjustment' && quantity > 0)
      ) {
        stockIn = quantity;
      } else if (
        op.type === 'stock_out' ||
        op.type === 'damage' ||
        op.type === 'return' ||
        (op.type === 'adjustment' && quantity < 0)
      ) {
        stockOut = Math.abs(quantity);
      } else if (op.type === 'stock_transfer' && op.fromWarehouseId) {
        stockOut = quantity;
      } else if (op.type === 'stock_transfer' && op.toWarehouseId) {
        stockIn = quantity;
      }

      operationEntries.push({
        operation: op,
        operationDate,
        quantity,
        stockIn,
        stockOut,
        operationType: op.type,
        operationId: op._id?.toString() || '',
      });
    });

    if (operationEntries.length === 0) {
      return NextResponse.json({
        sku,
        productName: product.name,
        currentStock,
        movements: [],
      });
    }

    // Sort operations chronologically (oldest first) to calculate net stock correctly
    operationEntries.sort(
      (a, b) => a.operationDate.getTime() - b.operationDate.getTime()
    );

    // Calculate starting stock before the filtered date range
    // We need to work backwards from current stock through ALL operations to get the correct starting stock
    let startingStock = currentStock;

    if (filterStartDate || filterEndDate) {
      // Get ALL operations for this SKU (not filtered) to calculate starting stock correctly
      const allOperationsForCalculation = await stockOperationsCollection
        .find({ 'items.sku': sku })
        .toArray();

      // Build entries for all operations to calculate starting stock
      const allOperationEntries: Array<{
        operationDate: Date;
        stockIn: number;
        stockOut: number;
      }> = [];

      allOperationsForCalculation.forEach((op) => {
        const item = op.items?.find((i: any) => i.sku === sku);
        if (!item) return;

        let operationDate: Date | null = null;
        let stockIn = 0;
        let stockOut = 0;
        const quantity = item.quantity || 0;

        // Determine date based on operation type
        if (op.type === 'stock_in') {
          operationDate = op.receivedDate
            ? new Date(op.receivedDate)
            : new Date(op.createdAt);
        } else if (op.type === 'stock_out') {
          operationDate = op.saleDate
            ? new Date(op.saleDate)
            : new Date(op.createdAt);
        } else if (op.type === 'stock_transfer') {
          operationDate = op.transferDate
            ? new Date(op.transferDate)
            : new Date(op.createdAt);
        } else if (op.type === 'damage') {
          operationDate = op.damageDate
            ? new Date(op.damageDate)
            : new Date(op.createdAt);
        } else if (op.type === 'adjustment') {
          operationDate = op.adjustmentDate
            ? new Date(op.adjustmentDate)
            : new Date(op.createdAt);
        } else if (op.type === 'return') {
          operationDate = op.returnDate
            ? new Date(op.returnDate)
            : new Date(op.createdAt);
        } else if (op.type === 'exchange') {
          operationDate = op.exchangeDate
            ? new Date(op.exchangeDate)
            : new Date(op.createdAt);
        } else {
          operationDate = new Date(op.createdAt);
        }

        if (!operationDate) return;

        // Determine stock in/out
        if (
          op.type === 'stock_in' ||
          (op.type === 'adjustment' && quantity > 0)
        ) {
          stockIn = quantity;
        } else if (
          op.type === 'stock_out' ||
          op.type === 'damage' ||
          op.type === 'return' ||
          (op.type === 'adjustment' && quantity < 0)
        ) {
          stockOut = Math.abs(quantity);
        } else if (op.type === 'stock_transfer' && op.fromWarehouseId) {
          stockOut = quantity;
        } else if (op.type === 'stock_transfer' && op.toWarehouseId) {
          stockIn = quantity;
        }

        allOperationEntries.push({
          operationDate,
          stockIn,
          stockOut,
        });
      });

      // Sort all operations chronologically (newest first)
      allOperationEntries.sort(
        (a, b) => b.operationDate.getTime() - a.operationDate.getTime()
      );

      // Determine cutoff date
      const cutoffDate = date
        ? new Date(date)
        : startDate
        ? new Date(startDate)
        : null;
      if (cutoffDate) {
        cutoffDate.setHours(0, 0, 0, 0);
      }

      // Work backwards from current stock through ALL operations
      // to find the stock at the start of the filtered date range
      allOperationEntries.forEach((entry) => {
        const entryDate = new Date(entry.operationDate);
        entryDate.setHours(0, 0, 0, 0);

        // Only work backwards through operations on or after the cutoff date
        // (we want to find the stock BEFORE the filter date)
        if (cutoffDate && entryDate >= cutoffDate) {
          const netChange = entry.stockIn - entry.stockOut;
          startingStock -= netChange; // Subtract because we're going backwards
        }
      });

      startingStock = Math.max(0, startingStock);
    } else {
      // No date filter - work backwards from current stock through all filtered operations
      // Sort operations newest first to work backwards
      const sortedEntries = [...operationEntries].sort(
        (a, b) => b.operationDate.getTime() - a.operationDate.getTime()
      );

      sortedEntries.forEach((entry) => {
        const netChange = entry.stockIn - entry.stockOut;
        startingStock -= netChange;
      });
      startingStock = Math.max(0, startingStock);
    }

    // Calculate net stock for each individual operation
    // operationEntries is already sorted chronologically (oldest first) from line 268
    let runningStock = startingStock;

    operationEntries.forEach((entry) => {
      const netChange = entry.stockIn - entry.stockOut;
      runningStock += netChange;

      const dateKey = entry.operationDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const timestamp = entry.operationDate.toISOString();

      movements.push({
        date: dateKey,
        stockIn: entry.stockIn,
        stockOut: entry.stockOut,
        netStock: runningStock,
        operationType: entry.operationType,
        operationId: entry.operationId,
        timestamp,
      });
    });

    // Sort by timestamp descending (newest first) for display
    movements.sort((a, b) =>
      (b.timestamp || b.date).localeCompare(a.timestamp || a.date)
    );

    return NextResponse.json({
      sku,
      productName: product.name,
      currentStock,
      movements,
    });
  } catch (error) {
    console.error('Get stock movement log error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
