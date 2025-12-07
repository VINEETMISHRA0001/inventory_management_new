import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * GET /api/quotations
 * Get all quotations with pagination and filtering
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
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const db = await getDatabase();
    const quotationsCollection = db.collection('quotations');

    // Build query - exclude soft-deleted quotations
    const query: any = {
      isDeleted: { $ne: true },
    };
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { quotationNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
      ];
    }

    const [quotations, total] = await Promise.all([
      quotationsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      quotationsCollection.countDocuments(query),
    ]);

    const formattedQuotations = quotations.map((q) => ({
      id: q._id.toString(),
      quotationNumber: q.quotationNumber || '',
      customerName: q.customerName || '',
      customerEmail: q.customerEmail || '',
      customerPhone: q.customerPhone || '',
      customerAddress: q.customerAddress || '',
      status: q.status || 'draft',
      subtotal: q.subtotal || 0,
      tax: q.tax || 0,
      discount: q.discount || 0,
      total: q.total || 0,
      validUntil: q.validUntil,
      notes: q.notes || '',
      items: q.items || [],
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      createdBy: q.createdBy?.toString(),
    }));

    return NextResponse.json({
      quotations: formattedQuotations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get quotations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quotations
 * Create a new quotation
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

    // Validate required fields
    if (!body.customerName || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Customer name and at least one item are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const quotationsCollection = db.collection('quotations');
    const productsCollection = db.collection('products');

    // Validate products and calculate totals
    let subtotal = 0;
    const validatedItems = [];

    for (const item of body.items) {
      if (!item.sku || !item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { error: `Invalid item: SKU and quantity required` },
          { status: 400 }
        );
      }

      const product = await productsCollection.findOne({
        sku: item.sku,
        isDeleted: { $ne: true },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product with SKU ${item.sku} not found` },
          { status: 400 }
        );
      }

      const unitPrice = item.unitPrice || product.price || 0;
      const discountPercent = item.discount || 0;
      const itemSubtotal = unitPrice * item.quantity;
      const discountAmount = itemSubtotal * (discountPercent / 100);
      const itemTotal = Math.max(0, itemSubtotal - discountAmount);
      subtotal += itemTotal;

      validatedItems.push({
        sku: item.sku,
        productName: product.name || '',
        productType: product.productType || '',
        quantity: item.quantity,
        unitPrice: unitPrice,
        discount: discountPercent,
        total: itemTotal,
      });
    }

    // Calculate totals
    const taxRate = body.taxRate || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    // Generate quotation number (count only non-deleted quotations)
    const count = await quotationsCollection.countDocuments({
      isDeleted: { $ne: true },
    });
    const quotationNumber = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    // Calculate valid until date (default 30 days)
    const validDays = body.validDays || 30;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    // Calculate total discount amount from all items (sum of discount amounts, not percentages)
    const totalDiscount = validatedItems.reduce((sum, item) => {
      const itemSubtotal = item.unitPrice * item.quantity;
      const itemDiscountAmount = itemSubtotal * ((item.discount || 0) / 100);
      return sum + itemDiscountAmount;
    }, 0);

    const quotationData = {
      quotationNumber,
      customerName: body.customerName,
      customerEmail: body.customerEmail || '',
      customerPhone: body.customerPhone || '',
      customerAddress: body.customerAddress || '',
      items: validatedItems,
      subtotal,
      taxRate,
      tax,
      discount: totalDiscount, // Total discount across all items (for backward compatibility)
      total,
      validUntil,
      notes: body.notes || '',
      status: 'draft',
      createdBy: new ObjectId(payload.userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await quotationsCollection.insertOne(quotationData);

    return NextResponse.json(
      {
        success: true,
        id: result.insertedId.toString(),
        quotationNumber,
        message: 'Quotation created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create quotation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

