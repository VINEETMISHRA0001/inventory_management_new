import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { hashPassword } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * Reset admin password endpoint - allows resetting admin password without current password.
 * This is a utility endpoint for admin password recovery.
 * WARNING: Should be protected in production or removed after initial setup.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const user = await db.collection('users').findOne({ email, role: 'admin' });

    if (!user) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    const hashedPassword = hashPassword(newPassword);

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
        $unset: {
          resetPasswordToken: '',
          resetPasswordExpiry: '',
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Admin password reset successfully',
    });
  } catch (error) {
    console.error('Reset admin password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

