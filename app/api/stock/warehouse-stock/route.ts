import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { getAvailableStock, getWarehouseStock, getProductBySku } from '@/lib/warehouse-stock';

/**
 * GET /api/stock/warehouse-stock
 * Get warehouse stock information for a product by SKU and warehouse ID
 * Query params: sku (required), warehouseId (required)
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
    const warehouseId = searchParams.get('warehouseId');

    if (!sku) {
      return NextResponse.json({ error: 'SKU is required' }, { status: 400 });
    }

    if (!warehouseId) {
      return NextResponse.json({ error: 'Warehouse ID is required' }, { status: 400 });
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(warehouseId)) {
      return NextResponse.json({ error: 'Invalid warehouse ID' }, { status: 400 });
    }

    // Get product by SKU
    const product = await getProductBySku(sku);
    if (!product) {
      return NextResponse.json(
        {
          available: 0,
          quantity: 0,
          reserved: 0,
          productFound: false,
          message: 'Product not found',
        },
        { status: 200 }
      );
    }

    // Get warehouse stock
    const quantity = await getWarehouseStock(product._id.toString(), warehouseId);
    const available = await getAvailableStock(product._id.toString(), warehouseId);
    const reserved = quantity - available;

    return NextResponse.json({
      available,
      quantity,
      reserved,
      productFound: true,
      productId: product._id.toString(),
      productName: product.name || '',
      sku: product.sku || '',
    });
  } catch (error) {
    console.error('Get warehouse stock error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

