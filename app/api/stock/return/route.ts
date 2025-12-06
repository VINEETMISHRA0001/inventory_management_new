import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import {
  updateWarehouseStock,
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
        if (!item.sku || !item.quantity || item.quantity <= 0) {
          return { valid: false, error: `Invalid item: SKU and quantity required` };
        }
        const product = await getProductBySku(item.sku);
        if (!product) {
          return { valid: false, error: `Product with SKU ${item.sku} not found` };
        }
        return { valid: true, product };
      })
    );

    const invalidItem = productValidations.find((v) => !v.valid);
    if (invalidItem) {
      return NextResponse.json({ error: invalidItem.error }, { status: 400 });
    }

    const operationData = {
      type: 'customer_return',
      warehouseId: body.warehouseId,
      returnDate: body.returnDate ? new Date(body.returnDate) : new Date(),
      orderReference: body.orderReference || '',
      customerName: body.customerName || '',
      returnReason: body.returnReason || '',
      notes: body.notes || '',
      items: body.items || [],
      status: 'completed', // Auto-complete returns (QC can be done separately if needed)
      requiresQC: false,
      createdBy: payload.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await stockOperationsCollection.insertOne(operationData);

    // Increase warehouse stock for returned items
    for (const item of body.items) {
      const product = await getProductBySku(item.sku);
      if (product) {
        // Increase warehouse stock
        await updateWarehouseStock(
          product._id.toString(),
          body.warehouseId,
          item.quantity
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

    return NextResponse.json(
      {
        success: true,
        id: result.insertedId.toString(),
        message: 'Return recorded successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Customer return error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


