import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { hashPassword } from '@/lib/auth';

/**
 * Initialize admin user - only one admin can exist in the database.
 * This endpoint should be called once to create the initial admin user.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const existingAdmin = await db.collection('users').findOne({ role: 'admin' });

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Admin user already exists. Only one admin is allowed.' },
        { status: 400 }
      );
    }

    const hashedPassword = hashPassword(password);

    const adminUser = {
      email,
      password: hashedPassword,
      role: 'admin',
      authType: 'email',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('users').insertOne(adminUser);

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
    });
  } catch (error) {
    console.error('Init admin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


