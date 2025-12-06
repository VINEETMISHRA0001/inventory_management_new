import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

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
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    // Filter parameters
    const brands = searchParams.get('brands')?.split(',').filter(Boolean) || [];
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
    const productTypes = searchParams.get('productTypes')?.split(',').filter(Boolean) || [];
    const status = searchParams.get('status') || '';
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
    const minQuantity = searchParams.get('minQuantity') ? parseInt(searchParams.get('minQuantity')!) : undefined;
    const maxQuantity = searchParams.get('maxQuantity') ? parseInt(searchParams.get('maxQuantity')!) : undefined;

    const db = await getDatabase();
    const productsCollection = db.collection('products');

    interface MongoQuery {
      isDeleted?: { $ne: boolean };
      $or?: Array<Record<string, { $regex: string; $options: string }>>;
      brand?: { $in: string[] };
      category?: { $in: string[] };
      productType?: { $in: string[] };
      isActive?: boolean;
      isDiscontinued?: boolean;
      mrp?: { $gte?: number; $lte?: number };
      quantity?: { $gte?: number; $lte?: number };
    }

    const query: MongoQuery = {
      isDeleted: { $ne: true },
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    // Apply filters
    if (brands.length > 0) {
      query.brand = { $in: brands };
    }

    if (categories.length > 0) {
      query.category = { $in: categories };
    }

    if (productTypes.length > 0) {
      query.productType = { $in: productTypes };
    }

    if (status === 'active') {
      query.isActive = true;
      query.isDiscontinued = false;
    } else if (status === 'inactive') {
      query.isActive = false;
    } else if (status === 'discontinued') {
      query.isDiscontinued = true;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.mrp = {};
      if (minPrice !== undefined) query.mrp.$gte = minPrice;
      if (maxPrice !== undefined) query.mrp.$lte = maxPrice;
    }

    if (minQuantity !== undefined || maxQuantity !== undefined) {
      query.quantity = {};
      if (minQuantity !== undefined) query.quantity.$gte = minQuantity;
      if (maxQuantity !== undefined) query.quantity.$lte = maxQuantity;
    }

    const [products, total] = await Promise.all([
      productsCollection.find(query).skip(skip).limit(limit).toArray(),
      productsCollection.countDocuments(query),
    ]);

    // Calculate total stock from warehouse_stock for each product
    const warehouseStockCollection = db.collection('warehouse_stock');
    const stockAggregation = await warehouseStockCollection.aggregate([
      {
        $group: {
          _id: '$productId',
          totalStock: { $sum: '$quantity' },
        },
      },
    ]).toArray();

    const stockMap = new Map(
      stockAggregation.map((item) => [item._id.toString(), item.totalStock])
    );

    let formattedProducts = products.map((product) => {
      const productId = product._id.toString();
      // Use warehouse stock total if available, otherwise fall back to product quantity
      const totalQuantity = stockMap.get(productId) ?? product.quantity ?? 0;

      return {
        id: productId,
        sku: product.sku || '',
        name: product.name || '',
        brand: product.brand || '',
        category: product.category || '',
        productType: product.productType || '',
        quantity: totalQuantity,
        mrp: product.mrp || 0,
        purchasePrice: product.purchasePrice || 0,
        sellingPrice: product.sellingPrice || 0,
        lowStockThreshold: product.lowStockThreshold || 0,
        reorderPoint: product.reorderPoint || 0,
        isActive: product.isActive ?? true,
        isDiscontinued: product.isDiscontinued ?? false,
        unit: product.unit || 'pcs',
        dimensions: product.dimensions || '',
        colors: product.colors || [],
        collection: product.collection || '',
        availableTillStocksLast: product.availableTillStocksLast ?? false,
        certifications: product.certifications || [],
        compatibility: product.compatibility || '',
        features: product.features || [],
        finish: product.finish || '',
        notes: product.notes || '',
        productCodeSeries: product.productCodeSeries || '',
        productStructure: product.productStructure || '',
        variants_description: product.variants_description || '',
        size: product.size || '',
        grade: product.grade || '',
        boxCoverage: product.boxCoverage || '',
        batch: product.batch || '',
        designType: product.designType || '',
        series: product.series || '',
        material: product.material || '',
        warrantyInfo: product.warrantyInfo || '',
      };
    });

    // Filter low stock products after aggregation (since it depends on warehouse stock totals)
    if (status === 'lowStock') {
      formattedProducts = formattedProducts.filter(
        (product) => product.quantity <= product.lowStockThreshold
      );
    }

    // Recalculate total after low stock filtering
    const finalTotal = status === 'lowStock' ? formattedProducts.length : total;

    return NextResponse.json({
      products: formattedProducts,
      pagination: {
        page,
        limit,
        total: finalTotal,
        totalPages: Math.ceil(finalTotal / limit),
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const db = await getDatabase();
    const productsCollection = db.collection('products');

    const productData = {
      sku: body.sku || '',
      name: body.name || '',
      brand: body.brand || 'CERA',
      category: body.category || '',
      productType: body.productType || '',
      quantity: body.quantity || 0,
      mrp: body.mrp || 0,
      purchasePrice: body.purchasePrice || 0,
      sellingPrice: body.sellingPrice || 0,
      lowStockThreshold: body.lowStockThreshold || 10,
      reorderPoint: body.reorderPoint || 5,
      unit: body.unit || 'pcs',
      isActive: body.isActive ?? true,
      isDiscontinued: body.isDiscontinued ?? false,
      dimensions: body.dimensions || '',
      colors: body.colors || [],
      collection: body.collection || '',
      availableTillStocksLast: body.availableTillStocksLast ?? false,
      certifications: body.certifications || [],
      compatibility: body.compatibility || '',
      features: body.features || [],
      finish: body.finish || '',
      notes: body.notes || '',
      productCodeSeries: body.productCodeSeries || '',
      productStructure: body.productStructure || '',
      variants_description: body.variants_description || '',
      size: body.size || '',
      grade: body.grade || '',
      boxCoverage: body.boxCoverage || '',
      batch: body.batch || '',
      designType: body.designType || '',
      series: body.series || '',
      material: body.material || '',
      warrantyInfo: body.warrantyInfo || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    };

    const result = await productsCollection.insertOne(productData);

    return NextResponse.json(
      {
        success: true,
        id: result.insertedId.toString(),
        message: 'Product created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
