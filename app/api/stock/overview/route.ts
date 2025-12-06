import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';

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
    const productsCollection = db.collection('products');
    const stockOperationsCollection = db.collection('stock_operations');
    const warehouseStockCollection = db.collection('warehouse_stock');

    const [totalProducts, availableStock, reservedStock, inTransit, damagedStock] = await Promise.all([
      productsCollection.countDocuments({ isDeleted: { $ne: true } }),
      // Get total available stock from warehouse_stock
      warehouseStockCollection.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: '$availableQuantity' },
          },
        },
      ]).toArray(),
      // Count reserved stock (items with reservedQuantity > 0)
      warehouseStockCollection.countDocuments({
        reservedQuantity: { $gt: 0 },
      }),
      stockOperationsCollection.countDocuments({
        type: 'stock_transfer',
        status: 'pending',
      }),
      stockOperationsCollection.countDocuments({
        type: 'damage',
        status: 'pending',
      }),
    ]);

    return NextResponse.json({
      available: availableStock[0]?.total || 0,
      reserved: reservedStock,
      inTransit: inTransit,
      damaged: damagedStock,
    });
  } catch (error) {
    console.error('Stock overview error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


