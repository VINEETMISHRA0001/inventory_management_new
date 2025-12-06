import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import {
  setWarehouseStock,
  validateWarehouse,
  getProductBySku,
  getTotalProductStock,
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

    // Validate warehouse
    if (!body.warehouseId) {
      return NextResponse.json({ error: 'Warehouse ID is required' }, { status: 400 });
    }

    const isValidWarehouse = await validateWarehouse(body.warehouseId);
    if (!isValidWarehouse) {
      return NextResponse.json({ error: 'Invalid or inactive warehouse' }, { status: 400 });
    }

    // Validate items
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    const db = await getDatabase();
    const stockOperationsCollection = db.collection('stock_operations');
    const productsCollection = db.collection('products');

    // Validate all products exist
    const productValidations = await Promise.all(
      body.items.map(async (item: any) => {
        if (!item.sku || item.adjustedQuantity === undefined) {
          return { valid: false, error: `Invalid item: SKU and adjusted quantity required` };
        }
        const product = await getProductBySku(item.sku);
        if (!product) {
          return { valid: false, error: `Product with SKU ${item.sku} not found` };
        }
        if (item.adjustedQuantity < 0) {
          return { valid: false, error: `Adjusted quantity cannot be negative for ${item.sku}` };
        }
        return { valid: true, product };
      })
    );

    const invalidItem = productValidations.find((v) => !v.valid);
    if (invalidItem) {
      return NextResponse.json({ error: invalidItem.error }, { status: 400 });
    }

    const operationData = {
      type: 'adjustment',
      warehouseId: body.warehouseId,
      adjustmentDate: body.adjustmentDate ? new Date(body.adjustmentDate) : new Date(),
      notes: body.notes || '',
      items: body.items || [],
      status: 'completed', // Auto-complete adjustments
      requiresApproval: false,
      createdBy: payload.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await stockOperationsCollection.insertOne(operationData);

    // Update warehouse stock for each item
    for (const item of body.items) {
      const product = await getProductBySku(item.sku);
      if (product) {
        // Set warehouse stock to adjusted quantity
        await setWarehouseStock(
          product._id.toString(),
          body.warehouseId,
          item.adjustedQuantity
        );

        // Update total quantity on product
        const totalStock = await getTotalProductStock(product._id.toString());
        await productsCollection.updateOne(
          { _id: product._id },
          {
            $set: {
              quantity: totalStock,
              updatedAt: new Date(),
            },
          }
        );
      }
    }

    // Check for stock alerts after adjustment operation
    const { checkStockAlerts } = await import('@/lib/stock-alerts');
    checkStockAlerts().catch(console.error); // Run in background

    return NextResponse.json(
      {
        success: true,
        id: result.insertedId.toString(),
        message: 'Stock adjustment completed successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Stock adjustment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


