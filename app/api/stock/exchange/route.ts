import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import {
  getAvailableStock,
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

    // Validate all products and check stock availability
    const stockChecks = await Promise.all(
      body.items.map(async (item: any) => {
        if (!item.fromSku || !item.toSku || !item.fromQuantity || !item.toQuantity) {
          return { valid: false, error: `Invalid item: All fields (fromSku, toSku, fromQuantity, toQuantity) are required` };
        }
        const fromProduct = await getProductBySku(item.fromSku);
        const toProduct = await getProductBySku(item.toSku);
        if (!fromProduct) {
          return { valid: false, error: `Product with SKU ${item.fromSku} not found` };
        }
        if (!toProduct) {
          return { valid: false, error: `Product with SKU ${item.toSku} not found` };
        }
        const availableStock = await getAvailableStock(
          fromProduct._id.toString(),
          body.warehouseId
        );
        if (availableStock < item.fromQuantity) {
          return {
            valid: false,
            error: `Insufficient stock for ${item.fromSku} in warehouse. Available: ${availableStock}, Requested: ${item.fromQuantity}`,
          };
        }
        return { valid: true, fromProduct, toProduct };
      })
    );

    const invalidItem = stockChecks.find((v) => !v.valid);
    if (invalidItem) {
      return NextResponse.json({ error: invalidItem.error }, { status: 400 });
    }

    const operationData = {
      type: 'exchange',
      warehouseId: body.warehouseId,
      exchangeDate: body.exchangeDate ? new Date(body.exchangeDate) : new Date(),
      orderReference: body.orderReference || '',
      customerName: body.customerName || '',
      notes: body.notes || '',
      items: body.items || [],
      status: 'completed',
      requiresApproval: false,
      createdBy: payload.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await stockOperationsCollection.insertOne(operationData);

    // Process exchange: decrease from product, increase to product
    for (const item of body.items) {
      const fromProduct = await getProductBySku(item.fromSku);
      const toProduct = await getProductBySku(item.toSku);

      if (fromProduct) {
        // Decrease from product stock
        await updateWarehouseStock(
          fromProduct._id.toString(),
          body.warehouseId,
          -item.fromQuantity
        );

        // Update total quantity
        const totalStock = await getTotalProductStock(fromProduct._id.toString());
        await productsCollection.updateOne(
          { _id: fromProduct._id },
          {
            $set: {
              quantity: totalStock,
              updatedAt: new Date(),
            },
          }
        );
      }

      if (toProduct) {
        // Increase to product stock
        await updateWarehouseStock(
          toProduct._id.toString(),
          body.warehouseId,
          item.toQuantity
        );

        // Update total quantity
        const totalStock = await getTotalProductStock(toProduct._id.toString());
        await productsCollection.updateOne(
          { _id: toProduct._id },
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
        message: 'Exchange processed successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Stock exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


