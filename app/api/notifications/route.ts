import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * GET /api/notifications
 * Get all notifications for the current user with pagination
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const db = await getDatabase();
    const notificationsCollection = db.collection('notifications');

    // Build query
    const query: any = {
      userId: new ObjectId(payload.userId),
    };
    if (unreadOnly) {
      query.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      notificationsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      notificationsCollection.countDocuments(query),
      notificationsCollection.countDocuments({
        userId: new ObjectId(payload.userId),
        isRead: false,
      }),
    ]);

    const formattedNotifications = notifications.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link || null,
      isRead: n.isRead || false,
      createdAt: n.createdAt,
      metadata: n.metadata || {},
    }));

    return NextResponse.json({
      notifications: formattedNotifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Create a new notification
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

    const body = await request.json();

    if (!body.userId || !body.type || !body.title || !body.message) {
      return NextResponse.json(
        { error: 'userId, type, title, and message are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const notificationsCollection = db.collection('notifications');

    const notificationData = {
      userId: new ObjectId(body.userId),
      type: body.type, // 'info', 'warning', 'error', 'success', 'stock_alert'
      title: body.title,
      message: body.message,
      link: body.link || null,
      isRead: false,
      metadata: body.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await notificationsCollection.insertOne(notificationData);

    return NextResponse.json(
      {
        success: true,
        id: result.insertedId.toString(),
        message: 'Notification created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

