import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * POST /api/quotations/[id]/approve
 * Approve a quotation (final status)
 */
export async function POST(
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
    const notificationsCollection = db.collection('notifications');

    const quotation = await quotationsCollection.findOne({
      _id: new ObjectId(id),
      isDeleted: { $ne: true },
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    // Update quotation status to approved
    await quotationsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: new ObjectId(payload.userId),
          updatedAt: new Date(),
        },
      }
    );

    // Create notification for quotation creator (if different from approver)
    if (quotation.createdBy && quotation.createdBy.toString() !== payload.userId) {
      await notificationsCollection.insertOne({
        userId: quotation.createdBy,
        type: 'success',
        title: 'Quotation Approved',
        message: `Quotation ${quotation.quotationNumber} has been approved.`,
        link: `/dashboard/quotations/${id}`,
        isRead: false,
        metadata: {
          quotationId: id,
          quotationNumber: quotation.quotationNumber,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Quotation approved successfully',
    });
  } catch (error) {
    console.error('Approve quotation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

