import { getDatabase } from './mongodb';
import { ObjectId } from 'mongodb';

/**
 * Check for stock alerts and create notifications
 * This should be called after stock operations that change stock levels
 */
export async function checkStockAlerts(lowStockThreshold: number = 10) {
  try {
    const db = await getDatabase();
    const warehouseStockCollection = db.collection('warehouse_stock');
    const productsCollection = db.collection('products');
    const notificationsCollection = db.collection('notifications');
    const usersCollection = db.collection('users');

    // Get all active users
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

    // Create notifications for low stock (only if not already notified in last hour)
    if (lowStockItems.length > 0) {
      for (const user of users) {
        const existingNotification = await notificationsCollection.findOne({
          userId: user._id,
          type: 'stock_alert',
          'metadata.alertType': 'low_stock',
          createdAt: {
            $gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        });

        if (!existingNotification) {
          await notificationsCollection.insertOne({
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
          });
        }
      }
    }

    // Create notifications for out of stock (only if not already notified in last hour)
    if (outOfStockItems.length > 0) {
      for (const user of users) {
        const existingNotification = await notificationsCollection.findOne({
          userId: user._id,
          type: 'stock_alert',
          'metadata.alertType': 'out_of_stock',
          createdAt: {
            $gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        });

        if (!existingNotification) {
          await notificationsCollection.insertOne({
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
          });
        }
      }
    }
  } catch (error) {
    console.error('Check stock alerts error:', error);
    // Don't throw - this is a background task
  }
}

