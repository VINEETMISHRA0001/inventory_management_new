import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * GET /api/stock/operations
 * Get stock operations history with filtering and pagination
 * Query params: type (optional), warehouseId (optional), page (optional), limit (optional)
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
    const type = searchParams.get('type'); // stock_in, stock_out, stock_transfer, etc.
    const warehouseId = searchParams.get('warehouseId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const db = await getDatabase();
    const stockOperationsCollection = db.collection('stock_operations');
    const warehousesCollection = db.collection('warehouses');
    const usersCollection = db.collection('users');

    // Build query
    const query: any = {};
    if (type) {
      query.type = type;
    }
    if (warehouseId && ObjectId.isValid(warehouseId)) {
      query.$or = [
        { warehouseId },
        { fromWarehouseId: warehouseId },
        { toWarehouseId: warehouseId },
      ];
    }

    // Get operations with pagination
    const [operations, total] = await Promise.all([
      stockOperationsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      stockOperationsCollection.countDocuments(query),
    ]);

    // Get warehouse and user info for enrichment
    const warehouseIds = new Set<string>();
    const userIds = new Set<string>();

    operations.forEach((op) => {
      if (op.warehouseId) warehouseIds.add(op.warehouseId);
      if (op.fromWarehouseId) warehouseIds.add(op.fromWarehouseId);
      if (op.toWarehouseId) warehouseIds.add(op.toWarehouseId);
      if (op.createdBy) userIds.add(op.createdBy);
    });

    const [warehouses, users] = await Promise.all([
      warehousesCollection
        .find({
          _id: { $in: Array.from(warehouseIds).map((id) => new ObjectId(id)) },
        })
        .toArray(),
      usersCollection
        .find({
          _id: { $in: Array.from(userIds).map((id) => new ObjectId(id)) },
        })
        .toArray(),
    ]);

    const warehouseMap = new Map(
      warehouses.map((w) => [w._id.toString(), { name: w.name, code: w.code }])
    );
    const userMap = new Map(
      users.map((u) => [u._id.toString(), { name: u.name, email: u.email }])
    );

    // Format operations
    const formattedOperations = operations.map((op) => {
      const warehouse = op.warehouseId ? warehouseMap.get(op.warehouseId) : null;
      const fromWarehouse = op.fromWarehouseId
        ? warehouseMap.get(op.fromWarehouseId)
        : null;
      const toWarehouse = op.toWarehouseId
        ? warehouseMap.get(op.toWarehouseId)
        : null;
      const createdByUser = op.createdBy ? userMap.get(op.createdBy) : null;

      return {
        id: op._id.toString(),
        type: op.type,
        status: op.status || 'completed',
        warehouse: warehouse
          ? { id: op.warehouseId, name: warehouse.name, code: warehouse.code }
          : null,
        fromWarehouse: fromWarehouse
          ? { id: op.fromWarehouseId, name: fromWarehouse.name, code: fromWarehouse.code }
          : null,
        toWarehouse: toWarehouse
          ? { id: op.toWarehouseId, name: toWarehouse.name, code: toWarehouse.code }
          : null,
        items: op.items || [],
        supplierReference: op.supplierReference || '',
        purchaseOrderNumber: op.purchaseOrderNumber || '',
        orderReference: op.orderReference || '',
        customerName: op.customerName || '',
        receivedDate: op.receivedDate,
        saleDate: op.saleDate,
        transferDate: op.transferDate,
        damageDate: op.damageDate,
        adjustmentDate: op.adjustmentDate,
        returnDate: op.returnDate,
        exchangeDate: op.exchangeDate,
        reason: op.reason || '',
        returnReason: op.returnReason || '',
        notes: op.notes || '',
        createdBy: createdByUser
          ? { id: op.createdBy, name: createdByUser.name, email: createdByUser.email }
          : null,
        createdAt: op.createdAt,
        updatedAt: op.updatedAt,
      };
    });

    return NextResponse.json({
      operations: formattedOperations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get stock operations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

