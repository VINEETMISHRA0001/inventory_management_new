import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import {
  getAvailableStock,
  updateWarehouseStock,
  validateWarehouse,
  getProductBySku,
} from '@/lib/warehouse-stock';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();

    // Validate warehouses
    if (!body.fromWarehouseId || !body.toWarehouseId) {
      return NextResponse.json(
        { error: 'Both from and to warehouse IDs are required' },
        { status: 400 }
      );
    }

    if (body.fromWarehouseId === body.toWarehouseId) {
      return NextResponse.json(
        { error: 'From and to warehouses must be different' },
        { status: 400 }
      );
    }

    const [isValidFromWarehouse, isValidToWarehouse] = await Promise.all([
      validateWarehouse(body.fromWarehouseId),
      validateWarehouse(body.toWarehouseId),
    ]);

    if (!isValidFromWarehouse) {
      return NextResponse.json({ error: 'Invalid or inactive source warehouse' }, { status: 400 });
    }

    if (!isValidToWarehouse) {
      return NextResponse.json({ error: 'Invalid or inactive destination warehouse' }, { status: 400 });
    }

    // Validate items
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    const db = await getDatabase();
    const stockOperationsCollection = db.collection('stock_operations');

    // Validate all products and check stock availability in source warehouse
    const stockChecks = await Promise.all(
      body.items.map(async (item: any) => {
        if (!item.sku || !item.quantity || item.quantity <= 0) {
          return { valid: false, error: `Invalid item: SKU and quantity required` };
        }
        const product = await getProductBySku(item.sku);
        if (!product) {
          return { valid: false, error: `Product with SKU ${item.sku} not found` };
        }
        const availableStock = await getAvailableStock(
          product._id.toString(),
          body.fromWarehouseId
        );
        if (availableStock < item.quantity) {
          return {
            valid: false,
            error: `Insufficient stock for ${item.sku} in source warehouse. Available: ${availableStock}, Requested: ${item.quantity}`,
          };
        }
        return { valid: true, product };
      })
    );

    const invalidItem = stockChecks.find((v) => !v.valid);
    if (invalidItem) {
      return NextResponse.json({ error: invalidItem.error }, { status: 400 });
    }

    const operationData = {
      type: 'stock_transfer',
      fromWarehouseId: body.fromWarehouseId,
      toWarehouseId: body.toWarehouseId,
      transferDate: body.transferDate ? new Date(body.transferDate) : new Date(),
      reason: body.reason || '',
      notes: body.notes || '',
      items: body.items || [],
      status: 'completed', // Auto-complete for immediate transfers
      requiresApproval: false,
      createdBy: payload.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await stockOperationsCollection.insertOne(operationData);

    // Transfer stock between warehouses
    for (const item of body.items) {
      const product = await getProductBySku(item.sku);
      if (product) {
        // Decrease from source warehouse
        await updateWarehouseStock(
          product._id.toString(),
          body.fromWarehouseId,
          -item.quantity
        );

        // Increase in destination warehouse
        await updateWarehouseStock(
          product._id.toString(),
          body.toWarehouseId,
          item.quantity
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        id: result.insertedId.toString(),
        message: 'Stock transfer completed successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Stock transfer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


