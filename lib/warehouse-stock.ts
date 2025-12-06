import { ObjectId } from 'mongodb';
import { getDatabase } from './mongodb';

/**
 * Warehouse Stock Management Utility
 * Handles all warehouse-specific stock operations for ERP-like inventory management
 */

export interface WarehouseStock {
  productId: string;
  warehouseId: string;
  quantity: number;
  reservedQuantity?: number;
  availableQuantity: number;
  lastUpdated: Date;
}

/**
 * Get stock quantity for a product in a specific warehouse
 */
export async function getWarehouseStock(
  productId: string,
  warehouseId: string
): Promise<number> {
  const db = await getDatabase();
  const warehouseStockCollection = db.collection('warehouse_stock');

  const stock = await warehouseStockCollection.findOne({
    productId: new ObjectId(productId),
    warehouseId: new ObjectId(warehouseId),
  });

  return stock ? stock.quantity : 0;
}

/**
 * Get available stock (quantity - reserved) for a product in a warehouse
 */
export async function getAvailableStock(
  productId: string,
  warehouseId: string
): Promise<number> {
  const db = await getDatabase();
  const warehouseStockCollection = db.collection('warehouse_stock');

  const stock = await warehouseStockCollection.findOne({
    productId: new ObjectId(productId),
    warehouseId: new ObjectId(warehouseId),
  });

  if (!stock) return 0;
  return (stock.quantity || 0) - (stock.reservedQuantity || 0);
}

/**
 * Update warehouse stock (increment or decrement)
 * Creates stock record if it doesn't exist
 */
export async function updateWarehouseStock(
  productId: string,
  warehouseId: string,
  quantityChange: number,
  reservedChange: number = 0
): Promise<void> {
  const db = await getDatabase();
  const warehouseStockCollection = db.collection('warehouse_stock');

  const productObjectId = new ObjectId(productId);
  const warehouseObjectId = new ObjectId(warehouseId);

  // Get current stock or create new
  const existingStock = await warehouseStockCollection.findOne({
    productId: productObjectId,
    warehouseId: warehouseObjectId,
  });

  if (existingStock) {
    const newQuantity = (existingStock.quantity || 0) + quantityChange;
    const newReserved = (existingStock.reservedQuantity || 0) + (reservedChange || 0);
    const availableQty = newQuantity - newReserved;

    await warehouseStockCollection.updateOne(
      {
        productId: productObjectId,
        warehouseId: warehouseObjectId,
      },
      {
        $inc: {
          quantity: quantityChange,
          reservedQuantity: reservedChange || 0,
        },
        $set: {
          lastUpdated: new Date(),
          availableQuantity: availableQty,
        },
      }
    );
  } else {
    const initialQuantity = quantityChange > 0 ? quantityChange : 0;
    const initialReserved = reservedChange || 0;
    const availableQty = initialQuantity - initialReserved;

    await warehouseStockCollection.insertOne({
      productId: productObjectId,
      warehouseId: warehouseObjectId,
      quantity: initialQuantity,
      reservedQuantity: initialReserved,
      availableQuantity: availableQty,
      createdAt: new Date(),
      lastUpdated: new Date(),
    });
  }
}

/**
 * Set warehouse stock to a specific quantity
 */
export async function setWarehouseStock(
  productId: string,
  warehouseId: string,
  quantity: number
): Promise<void> {
  const db = await getDatabase();
  const warehouseStockCollection = db.collection('warehouse_stock');

  const productObjectId = new ObjectId(productId);
  const warehouseObjectId = new ObjectId(warehouseId);

  const existing = await warehouseStockCollection.findOne({
    productId: productObjectId,
    warehouseId: warehouseObjectId,
  });

  const reservedQty = existing?.reservedQuantity || 0;
  const availableQty = quantity - reservedQty;

  await warehouseStockCollection.updateOne(
    {
      productId: productObjectId,
      warehouseId: warehouseObjectId,
    },
    {
      $set: {
        quantity,
        availableQuantity: availableQty,
        lastUpdated: new Date(),
      },
      $setOnInsert: {
        productId: productObjectId,
        warehouseId: warehouseObjectId,
        reservedQuantity: 0,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}

/**
 * Get total stock across all warehouses for a product
 */
export async function getTotalProductStock(productId: string): Promise<number> {
  const db = await getDatabase();
  const warehouseStockCollection = db.collection('warehouse_stock');

  const result = await warehouseStockCollection.aggregate([
    {
      $match: {
        productId: new ObjectId(productId),
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$quantity' },
      },
    },
  ]).toArray();

  return result[0]?.total || 0;
}

/**
 * Validate warehouse exists and is active
 */
export async function validateWarehouse(warehouseId: string): Promise<boolean> {
  const db = await getDatabase();
  const warehousesCollection = db.collection('warehouses');

  if (!ObjectId.isValid(warehouseId)) {
    return false;
  }

  const warehouse = await warehousesCollection.findOne({
    _id: new ObjectId(warehouseId),
    isDeleted: { $ne: true },
    isActive: true,
  });

  return !!warehouse;
}

/**
 * Validate product exists and is active
 */
export async function validateProduct(productId: string): Promise<boolean> {
  const db = await getDatabase();
  const productsCollection = db.collection('products');

  if (!ObjectId.isValid(productId)) {
    return false;
  }

  const product = await productsCollection.findOne({
    _id: new ObjectId(productId),
    isDeleted: { $ne: true },
  });

  return !!product;
}

/**
 * Get product by SKU
 */
export async function getProductBySku(sku: string) {
  const db = await getDatabase();
  const productsCollection = db.collection('products');

  return await productsCollection.findOne({
    sku,
    isDeleted: { $ne: true },
  });
}

