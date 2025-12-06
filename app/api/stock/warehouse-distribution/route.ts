import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * GET /api/stock/warehouse-distribution
 * Get stock distribution across all warehouses
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

    const db = await getDatabase();
    const warehousesCollection = db.collection('warehouses');
    const warehouseStockCollection = db.collection('warehouse_stock');
    const stockOperationsCollection = db.collection('stock_operations');

    // Get all active warehouses
    const warehouses = await warehousesCollection
      .find({ isDeleted: { $ne: true }, isActive: true })
      .toArray();

    // Get stock summary per warehouse
    const stockSummary = await warehouseStockCollection.aggregate([
      {
        $group: {
          _id: '$warehouseId',
          totalQuantity: { $sum: '$quantity' },
          totalAvailable: { $sum: '$availableQuantity' },
          totalReserved: { $sum: '$reservedQuantity' },
          productCount: { $sum: 1 },
        },
      },
    ]).toArray();

    // Create a map of warehouse stock
    const stockMap = new Map(
      stockSummary.map((item) => [
        item._id.toString(),
        {
          totalQuantity: item.totalQuantity || 0,
          totalAvailable: item.totalAvailable || 0,
          totalReserved: item.totalReserved || 0,
          productCount: item.productCount || 0,
        },
      ])
    );

    // Combine warehouse info with stock data
    const warehouseDistribution = warehouses.map((warehouse) => {
      const warehouseId = warehouse._id.toString();
      const stock = stockMap.get(warehouseId) || {
        totalQuantity: 0,
        totalAvailable: 0,
        totalReserved: 0,
        productCount: 0,
      };

      // Current Remaining = Total Quantity - Reserved (what's actually available to use)
      const currentRemaining = stock.totalQuantity - stock.totalReserved;

      return {
        warehouseId,
        warehouseName: warehouse.name || '',
        warehouseCode: warehouse.code || '',
        address: warehouse.address || '',
        city: warehouse.city || '',
        state: warehouse.state || '',
        totalQuantity: stock.totalQuantity,
        totalAvailable: stock.totalAvailable,
        totalReserved: stock.totalReserved,
        currentRemaining: currentRemaining,
        productCount: stock.productCount,
      };
    });

    return NextResponse.json({
      warehouses: warehouseDistribution,
      totalWarehouses: warehouseDistribution.length,
    });
  } catch (error) {
    console.error('Get warehouse distribution error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

