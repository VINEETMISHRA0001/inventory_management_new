import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * GET /api/quotations/[id]
 * Get a single quotation by ID
 */
export async function GET(
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
    const usersCollection = db.collection('users');

    const quotation = await quotationsCollection.findOne({
      _id: new ObjectId(id),
      isDeleted: { $ne: true },
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    // Get creator info
    let createdByUser = null;
    if (quotation.createdBy) {
      createdByUser = await usersCollection.findOne({
        _id: quotation.createdBy,
      });
    }

    const formattedQuotation = {
      id: quotation._id.toString(),
      quotationNumber: quotation.quotationNumber || '',
      customerName: quotation.customerName || '',
      customerEmail: quotation.customerEmail || '',
      customerPhone: quotation.customerPhone || '',
      customerAddress: quotation.customerAddress || '',
      status: quotation.status || 'draft',
      items: quotation.items || [],
      subtotal: quotation.subtotal || 0,
      taxRate: quotation.taxRate || 0,
      tax: quotation.tax || 0,
      discount: quotation.discount || 0,
      total: quotation.total || 0,
      validUntil: quotation.validUntil,
      notes: quotation.notes || '',
      createdBy: createdByUser
        ? {
            id: createdByUser._id.toString(),
            name: createdByUser.name,
            email: createdByUser.email,
          }
        : null,
      createdAt: quotation.createdAt,
      updatedAt: quotation.updatedAt,
    };

    return NextResponse.json(formattedQuotation);
  } catch (error) {
    console.error('Get quotation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/quotations/[id]
 * Update a quotation
 */
export async function PUT(
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

    const body = await request.json();
    const db = await getDatabase();
    const quotationsCollection = db.collection('quotations');
    const productsCollection = db.collection('products');

    const existingQuotation = await quotationsCollection.findOne({
      _id: new ObjectId(id),
      isDeleted: { $ne: true },
    });

    if (!existingQuotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    // If items are being updated, recalculate totals
    let updateData: any = {
      updatedAt: new Date(),
    };

    if (body.items && Array.isArray(body.items)) {
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
        const itemTotal = unitPrice * item.quantity;
        subtotal += itemTotal;

        validatedItems.push({
          sku: item.sku,
          productName: product.name || '',
          quantity: item.quantity,
          unitPrice: unitPrice,
          total: itemTotal,
        });
      }

      const taxRate = body.taxRate !== undefined ? body.taxRate : existingQuotation.taxRate || 0;
      const discount = body.discount || 0;
      const tax = (subtotal - discount) * (taxRate / 100);
      const total = subtotal - discount + tax;

      updateData.items = validatedItems;
      updateData.subtotal = subtotal;
      updateData.taxRate = taxRate;
      updateData.tax = tax;
      updateData.discount = discount;
      updateData.total = total;
    }

    // Update other fields
    if (body.customerName) updateData.customerName = body.customerName;
    if (body.customerEmail !== undefined) updateData.customerEmail = body.customerEmail;
    if (body.customerPhone !== undefined) updateData.customerPhone = body.customerPhone;
    if (body.customerAddress !== undefined) updateData.customerAddress = body.customerAddress;
    if (body.status) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.validDays) {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + body.validDays);
      updateData.validUntil = validUntil;
    }

    await quotationsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    return NextResponse.json({
      success: true,
      message: 'Quotation updated successfully',
    });
  } catch (error) {
    console.error('Update quotation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/quotations/[id]
 * Soft delete a quotation (mark as deleted instead of removing)
 */
export async function DELETE(
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

    // Check if quotation exists
    const quotation = await quotationsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    // Soft delete: mark as deleted instead of removing
    await quotationsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: new ObjectId(payload.userId),
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Quotation deleted successfully',
    });
  } catch (error) {
    console.error('Delete quotation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

