import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * POST /api/stock/alerts
 * Check for stock alerts and create notifications
 * This should be called periodically or after stock operations
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
    const lowStockThreshold = body.lowStockThreshold || 10; // Default threshold

    const db = await getDatabase();
    const warehouseStockCollection = db.collection('warehouse_stock');
    const productsCollection = db.collection('products');
    const notificationsCollection = db.collection('notifications');
    const usersCollection = db.collection('users');

    // Get all active users (for now, notify all admins/managers)
    const users = await usersCollection.find({ isDeleted: { $ne: true } }).toArray();

    // Find products with low stock
    const lowStockItems = await warehouseStockCollection
      .aggregate([
        {
          $match: {
            availableQuantity: { $lte: lowStockThreshold },
            quantity: { $gt: 0 },
          },
        },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        {
          $unwind: '$product',
        },
        {
          $match: {
            'product.isDeleted': { $ne: true },
          },
        },
        {
          $project: {
            productId: 1,
            productName: '$product.name',
            sku: '$product.sku',
            availableQuantity: 1,
            warehouseId: 1,
          },
        },
      ])
      .toArray();

    // Find products with zero stock
    const outOfStockItems = await warehouseStockCollection
      .aggregate([
        {
          $match: {
            availableQuantity: 0,
            quantity: 0,
          },
        },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        {
          $unwind: '$product',
        },
        {
          $match: {
            'product.isDeleted': { $ne: true },
          },
        },
        {
          $project: {
            productId: 1,
            productName: '$product.name',
            sku: '$product.sku',
            warehouseId: 1,
          },
        },
      ])
      .toArray();

    const notificationsCreated = [];

    // Create notifications for low stock
    if (lowStockItems.length > 0) {
      for (const user of users) {
        const notification = {
          userId: user._id,
          type: 'stock_alert',
          title: 'Low Stock Alert',
          message: `${lowStockItems.length} product(s) are running low on stock (≤${lowStockThreshold} units available)`,
          link: '/dashboard/stock',
          isRead: false,
          metadata: {
            alertType: 'low_stock',
            itemCount: lowStockItems.length,
            items: lowStockItems.slice(0, 5).map((item: any) => ({
              sku: item.sku,
              name: item.productName,
              available: item.availableQuantity,
            })),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Check if similar notification already exists (within last hour)
        const existingNotification = await notificationsCollection.findOne({
          userId: user._id,
          type: 'stock_alert',
          'metadata.alertType': 'low_stock',
          createdAt: {
            $gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        });

        if (!existingNotification) {
          await notificationsCollection.insertOne(notification);
          notificationsCreated.push(notification);
        }
      }
    }

    // Create notifications for out of stock
    if (outOfStockItems.length > 0) {
      for (const user of users) {
        const notification = {
          userId: user._id,
          type: 'stock_alert',
          title: 'Out of Stock Alert',
          message: `${outOfStockItems.length} product(s) are out of stock`,
          link: '/dashboard/stock',
          isRead: false,
          metadata: {
            alertType: 'out_of_stock',
            itemCount: outOfStockItems.length,
            items: outOfStockItems.slice(0, 5).map((item: any) => ({
              sku: item.sku,
              name: item.productName,
            })),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Check if similar notification already exists (within last hour)
        const existingNotification = await notificationsCollection.findOne({
          userId: user._id,
          type: 'stock_alert',
          'metadata.alertType': 'out_of_stock',
          createdAt: {
            $gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        });

        if (!existingNotification) {
          await notificationsCollection.insertOne(notification);
          notificationsCreated.push(notification);
        }
      }
    }

    return NextResponse.json({
      success: true,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      notificationsCreated: notificationsCreated.length,
      message: 'Stock alerts checked and notifications created',
    });
  } catch (error) {
    console.error('Stock alerts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

