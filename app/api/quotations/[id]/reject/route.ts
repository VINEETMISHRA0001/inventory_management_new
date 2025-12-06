import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * POST /api/quotations/[id]/reject
 * Reject a quotation
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
    const body = await request.json();

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

    // Update quotation status to rejected
    await quotationsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'rejected',
          rejectedAt: new Date(),
          rejectedBy: new ObjectId(payload.userId),
          rejectionReason: body.reason || '',
          updatedAt: new Date(),
        },
      }
    );

    // Create notification for quotation creator (if different from rejector)
    if (quotation.createdBy && quotation.createdBy.toString() !== payload.userId) {
      await notificationsCollection.insertOne({
        userId: quotation.createdBy,
        type: 'error',
        title: 'Quotation Rejected',
        message: `Quotation ${quotation.quotationNumber} has been rejected.${body.reason ? ` Reason: ${body.reason}` : ''}`,
        link: `/dashboard/quotations/${id}`,
        isRead: false,
        metadata: {
          quotationId: id,
          quotationNumber: quotation.quotationNumber,
          reason: body.reason || '',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Quotation rejected successfully',
    });
  } catch (error) {
    console.error('Reject quotation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

