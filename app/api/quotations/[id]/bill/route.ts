import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * GET /api/quotations/[id]/bill
 * Generate a mini bill/PDF for the quotation
 */
export async function GET(
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

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid quotation ID' }, { status: 400 });
    }

    const db = await getDatabase();
    const quotationsCollection = db.collection('quotations');
    const usersCollection = db.collection('users');

    const quotation = await quotationsCollection.findOne({
      _id: new ObjectId(id),
      isDeleted: { $ne: true },
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    // Get creator info
    let createdByUser = null;
    if (quotation.createdBy) {
      createdByUser = await usersCollection.findOne({
        _id: quotation.createdBy,
      });
    }

    // Format bill data
    const billData = {
      quotationNumber: quotation.quotationNumber || '',
      date: new Date(quotation.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      validUntil: new Date(quotation.validUntil).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      customer: {
        name: quotation.customerName || '',
        email: quotation.customerEmail || '',
        phone: quotation.customerPhone || '',
        address: quotation.customerAddress || '',
      },
      items: (quotation.items || []).map((item: any) => ({
        sku: item.sku || '',
        productName: item.productName || '',
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || 0,
        total: item.total || 0,
      })),
      subtotal: quotation.subtotal || 0,
      taxRate: quotation.taxRate || 0,
      tax: quotation.tax || 0,
      discount: quotation.discount || 0,
      total: quotation.total || 0,
      notes: quotation.notes || '',
      createdBy: createdByUser
        ? {
            name: createdByUser.name,
            email: createdByUser.email,
          }
        : null,
    };

    return NextResponse.json({
      success: true,
      bill: billData,
    });
  } catch (error) {
    console.error('Generate bill error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

