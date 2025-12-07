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

    // Get total stock per product from warehouse_stock
    const stockAggregation = await warehouseStockCollection.aggregate([
      {
        $group: {
          _id: '$productId',
          totalStock: { $sum: '$quantity' },
        },
      },
    ]).toArray();

    const stockMap = new Map(
      stockAggregation.map((item) => [item._id.toString(), item.totalStock])
    );

    const [totalProducts, availableStock, inTransit, damagedStock, allProducts] = await Promise.all([
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
      stockOperationsCollection.countDocuments({
        type: 'stock_transfer',
        status: 'pending',
      }),
      stockOperationsCollection.countDocuments({
        type: 'damage',
        status: 'pending',
      }),
      productsCollection.find({ isDeleted: { $ne: true } }).toArray(),
    ]);

    // Calculate low stock products using warehouse stock
    let lowStockCount = 0;
    for (const product of allProducts) {
      const productId = product._id.toString();
      const totalStock = stockMap.get(productId) ?? product.quantity ?? 0;
      const lowStockThreshold = product.lowStockThreshold || 0;

      if (
        product.isActive &&
        !product.isDiscontinued &&
        totalStock <= lowStockThreshold
      ) {
        lowStockCount++;
      }
    }

    return NextResponse.json({
      available: availableStock[0]?.total || 0,
      lowStock: lowStockCount,
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


