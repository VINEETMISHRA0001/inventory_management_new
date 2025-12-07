import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const db = await getDatabase();
    const warehousesCollection = db.collection('warehouses');

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid warehouse ID' }, { status: 400 });
    }

    const updateData = {
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
      updatedAt: new Date(),
    };

    const result = await warehousesCollection.updateOne(
      { _id: new ObjectId(id), isDeleted: { $ne: true } },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Warehouse updated successfully',
    });
  } catch (error) {
    console.error('Update warehouse error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDatabase();
    const warehousesCollection = db.collection('warehouses');

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid warehouse ID' }, { status: 400 });
    }

    // Soft delete
    const result = await warehousesCollection.updateOne(
      { _id: new ObjectId(id), isDeleted: { $ne: true } },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Warehouse deleted successfully',
    });
  } catch (error) {
    console.error('Delete warehouse error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
