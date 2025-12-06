import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/products/bulk
 * Bulk create products from JSON array
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

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be an array of products' },
        { status: 400 }
      );
    }

    if (body.length === 0) {
      return NextResponse.json(
        { error: 'No products provided' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const productsCollection = db.collection('products');

    // Validate and transform products
    const products = body.map((row: any) => ({
      sku: row.sku || '',
      name: row.name || '',
      brand: row.brand || 'CERA',
      category: row.category || '',
      productType: row.productType || '',
      quantity:
        typeof row.quantity === 'number'
          ? row.quantity
          : parseFloat(row.quantity || '0'),
      mrp: typeof row.mrp === 'number' ? row.mrp : parseFloat(row.mrp || '0'),
      purchasePrice:
        typeof row.purchasePrice === 'number'
          ? row.purchasePrice
          : parseFloat(row.purchasePrice || '0'),
      sellingPrice:
        typeof row.sellingPrice === 'number'
          ? row.sellingPrice
          : parseFloat(row.sellingPrice || '0'),
      lowStockThreshold:
        typeof row.lowStockThreshold === 'number'
          ? row.lowStockThreshold
          : parseFloat(row.lowStockThreshold || '10'),
      reorderPoint:
        typeof row.reorderPoint === 'number'
          ? row.reorderPoint
          : parseFloat(row.reorderPoint || '5'),
      unit: row.unit || 'pcs',
      isActive:
        row.isActive !== false &&
        row.isActive !== 'false' &&
        row.isActive !== '0',
      isDiscontinued:
        row.isDiscontinued === true ||
        row.isDiscontinued === 'true' ||
        row.isDiscontinued === '1',
      dimensions: row.dimensions || '',
      colors: Array.isArray(row.colors)
        ? row.colors
        : row.colors
        ? typeof row.colors === 'string'
          ? row.colors.split(',').map((c: string) => c.trim())
          : []
        : [],
      collection: row.collection || '',
      availableTillStocksLast:
        row.availableTillStocksLast === true ||
        row.availableTillStocksLast === 'true' ||
        row.availableTillStocksLast === '1',
      certifications: Array.isArray(row.certifications)
        ? row.certifications
        : row.certifications
        ? typeof row.certifications === 'string'
          ? row.certifications.split(',').map((c: string) => c.trim())
          : []
        : [],
      compatibility: row.compatibility || '',
      features: Array.isArray(row.features)
        ? row.features
        : row.features
        ? typeof row.features === 'string'
          ? row.features.split(',').map((f: string) => f.trim())
          : []
        : [],
      finish: row.finish || '',
      notes: row.notes || '',
      productCodeSeries: row.productCodeSeries || '',
      productStructure: row.productStructure || '',
      variants_description: row.variants_description || '',
      size: row.size || '',
      grade: row.grade || '',
      boxCoverage: row.boxCoverage || '',
      batch: row.batch || '',
      designType: row.designType || '',
      series: row.series || '',
      material: row.material || '',
      warrantyInfo: row.warrantyInfo || '',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Check for duplicate SKUs
    const skus = products.map((p: any) => p.sku).filter(Boolean);
    const existingProducts = await productsCollection
      .find({
        sku: { $in: skus },
        isDeleted: { $ne: true },
      })
      .toArray();

    if (existingProducts.length > 0) {
      const duplicateSkus = existingProducts.map((p: any) => p.sku);
      return NextResponse.json(
        {
          error: `Products with SKUs already exist: ${duplicateSkus.join(
            ', '
          )}`,
        },
        { status: 400 }
      );
    }

    const result = await productsCollection.insertMany(products);

    return NextResponse.json({
      success: true,
      message: `${result.insertedCount} products uploaded successfully`,
      insertedCount: result.insertedCount,
    });
  } catch (error: any) {
    console.error('Bulk upload products error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
