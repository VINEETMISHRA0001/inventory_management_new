import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/stock/today-movements
 * Get stock movements for a specific date (defaults to today)
 * Query params: date (optional, format: YYYY-MM-DD)
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
    const dateParam = searchParams.get('date');

    const db = await getDatabase();
    const productsCollection = db.collection('products');
    const stockOperationsCollection = db.collection('stock_operations');

    // Get the target date (default to today)
    // Parse date string explicitly to avoid timezone issues
    let targetDate: Date;
    if (dateParam) {
      // Parse YYYY-MM-DD format explicitly in local timezone
      const [year, month, day] = dateParam.split('-').map(Number);
      targetDate = new Date(year, month - 1, day);
    } else {
      targetDate = new Date();
    }
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get all products
    const products = await productsCollection
      .find({ isDeleted: { $ne: true } })
      .toArray();

    // Get all stock operations
    const allOperations = await stockOperationsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Filter operations by target date based on operation type
    const targetDateOperations = allOperations.filter((op) => {
      let operationDate: Date | null = null;

      // Determine date based on operation type, with fallback to createdAt
      if (op.type === 'stock_in') {
        operationDate = op.receivedDate ? new Date(op.receivedDate) : (op.createdAt ? new Date(op.createdAt) : null);
      } else if (op.type === 'stock_out') {
        operationDate = op.saleDate ? new Date(op.saleDate) : (op.createdAt ? new Date(op.createdAt) : null);
      } else if (op.type === 'stock_transfer') {
        operationDate = op.transferDate ? new Date(op.transferDate) : (op.createdAt ? new Date(op.createdAt) : null);
      } else if (op.type === 'damage') {
        operationDate = op.damageDate ? new Date(op.damageDate) : (op.createdAt ? new Date(op.createdAt) : null);
      } else if (op.type === 'adjustment') {
        operationDate = op.adjustmentDate ? new Date(op.adjustmentDate) : (op.createdAt ? new Date(op.createdAt) : null);
      } else if (op.type === 'return') {
        operationDate = op.returnDate ? new Date(op.returnDate) : (op.createdAt ? new Date(op.createdAt) : null);
      } else if (op.type === 'exchange') {
        operationDate = op.exchangeDate ? new Date(op.exchangeDate) : (op.createdAt ? new Date(op.createdAt) : null);
      } else {
        // For unknown operation types, use createdAt
        operationDate = op.createdAt ? new Date(op.createdAt) : null;
      }

      // If no date available at all, exclude this operation
      if (!operationDate) return false;

      // Normalize operation date to start of day for comparison
      const opDate = new Date(operationDate);
      opDate.setHours(0, 0, 0, 0);

      // Compare dates (both normalized to start of day)
      return opDate.getTime() >= targetDate.getTime() && opDate.getTime() < nextDay.getTime();
    });

    // Aggregate movements by SKU and track latest timestamp
    const movementsBySku = new Map<
      string,
      { stockIn: number; stockOut: number; lastUpdated: Date | null }
    >();

    targetDateOperations.forEach((op) => {
      if (!op.items || !Array.isArray(op.items)) return;

      // Get the operation's createdAt timestamp
      const opCreatedAt = op.createdAt ? new Date(op.createdAt) : null;

      op.items.forEach((item: any) => {
        const sku = item.sku;
        if (!sku) return;

        const quantity = item.quantity || 0;
        let stockIn = 0;
        let stockOut = 0;

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

        if (stockIn > 0 || stockOut > 0) {
          const existing = movementsBySku.get(sku) || { 
            stockIn: 0, 
            stockOut: 0, 
            lastUpdated: null 
          };
          
          // Update lastUpdated if this operation is newer
          let lastUpdated = existing.lastUpdated;
          if (opCreatedAt) {
            if (!lastUpdated || opCreatedAt.getTime() > lastUpdated.getTime()) {
              lastUpdated = opCreatedAt;
            }
          }
          
          movementsBySku.set(sku, {
            stockIn: existing.stockIn + stockIn,
            stockOut: existing.stockOut + stockOut,
            lastUpdated,
          });
        }
      });
    });

    // Build response with all products that have movements on the target date
    const movements = Array.from(movementsBySku.entries()).map(([sku, data]) => {
      const product = products.find((p) => p.sku === sku);
      return {
        sku,
        productName: product?.name || '',
        productType: product?.productType || '',
        stockIn: data.stockIn,
        stockOut: data.stockOut,
        nettStock: data.stockIn - data.stockOut,
        lastUpdated: data.lastUpdated ? data.lastUpdated.toISOString() : null,
      };
    });

    // Sort by lastUpdated timestamp (latest first), then by SKU as fallback
    movements.sort((a, b) => {
      if (a.lastUpdated && b.lastUpdated) {
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      }
      if (a.lastUpdated) return -1;
      if (b.lastUpdated) return 1;
      return a.sku.localeCompare(b.sku);
    });

    // Format date as YYYY-MM-DD in local timezone (consistent with input parsing)
    const formattedDate = dateParam || 
      `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

    return NextResponse.json({
      date: formattedDate,
      movements,
    });
  } catch (error) {
    console.error('Get today movements error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

