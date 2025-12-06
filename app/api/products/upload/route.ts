import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';

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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const Papa = (await import('papaparse')).default;

    const parseResult = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parsing error', details: parseResult.errors },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const products = parseResult.data.map((row: any) => ({
      ...row,
      quantity: parseFloat(row.quantity) || 0,
      purchasePrice: parseFloat(row.purchasePrice) || 0,
      sellingPrice: parseFloat(row.sellingPrice) || 0,
      mrp: parseFloat(row.mrp) || 0,
      lowStockThreshold: parseFloat(row.lowStockThreshold) || 10,
      reorderPoint: parseFloat(row.reorderPoint) || 5,
      isActive: row.isActive !== 'false' && row.isActive !== '0',
      isDiscontinued: row.isDiscontinued === 'true' || row.isDiscontinued === '1',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await db.collection('products').insertMany(products);

    return NextResponse.json({
      success: true,
      message: `${result.insertedCount} products uploaded successfully`,
      insertedCount: result.insertedCount,
    });
  } catch (error) {
    console.error('Upload products error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

