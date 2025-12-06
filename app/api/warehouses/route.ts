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
    const warehousesCollection = db.collection('warehouses');

    const warehouses = await warehousesCollection
      .find({ isDeleted: { $ne: true } })
      .toArray();

    const formattedWarehouses = warehouses.map((warehouse) => ({
      id: warehouse._id.toString(),
      name: warehouse.name || '',
      code: warehouse.code || '',
      address: warehouse.address || '',
      city: warehouse.city || '',
      state: warehouse.state || '',
      pincode: warehouse.pincode || '',
      phone: warehouse.phone || '',
      email: warehouse.email || '',
      manager: warehouse.manager || '',
      isActive: warehouse.isActive ?? true,
    }));

    return NextResponse.json({ warehouses: formattedWarehouses });
  } catch (error) {
    console.error('Get warehouses error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const db = await getDatabase();
    const warehousesCollection = db.collection('warehouses');

    const warehouseData = {
      name: body.name || '',
      code: body.code || '',
      address: body.address || '',
      city: body.city || '',
      state: body.state || '',
      pincode: body.pincode || '',
      phone: body.phone || '',
      email: body.email || '',
      manager: body.manager || '',
      isActive: body.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    };

    const result = await warehousesCollection.insertOne(warehouseData);

    return NextResponse.json(
      {
        success: true,
        id: result.insertedId.toString(),
        message: 'Warehouse created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create warehouse error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


