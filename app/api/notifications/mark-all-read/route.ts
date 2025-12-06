import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for the current user
 */
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

    const db = await getDatabase();
    const notificationsCollection = db.collection('notifications');

    const result = await notificationsCollection.updateMany(
      {
        userId: new ObjectId(payload.userId),
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      count: result.modifiedCount,
      message: `${result.modifiedCount} notifications marked as read`,
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

