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
    const quotationsCollection = db.collection('quotations');

    const query = { isDeleted: { $ne: true } };

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

    const [totalProducts, activeProducts, allProducts, totalQuotations] = await Promise.all([
      productsCollection.countDocuments(query),
      productsCollection.countDocuments({ ...query, isActive: true, isDiscontinued: { $ne: true } }),
      productsCollection.find(query).toArray(),
      quotationsCollection.countDocuments({ isDeleted: { $ne: true } }),
    ]);

    // Calculate low stock products and total value using warehouse stock
    let lowStockProducts = 0;
    let totalValue = 0;

    for (const product of allProducts) {
      const productId = product._id.toString();
      const totalStock = stockMap.get(productId) ?? product.quantity ?? 0;
      const lowStockThreshold = product.lowStockThreshold || 0;

      if (
        product.isActive &&
        !product.isDiscontinued &&
        totalStock <= lowStockThreshold
      ) {
        lowStockProducts++;
      }

      totalValue += totalStock * (product.mrp || 0);
    }

    return NextResponse.json({
      totalProducts,
      activeProducts,
      lowStockCount: lowStockProducts,
      totalValue,
      totalQuotations,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

