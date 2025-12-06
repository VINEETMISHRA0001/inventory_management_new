import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { checkStockAlerts } from '@/lib/stock-alerts';

/**
 * POST /api/stock/check-alerts
 * Manually trigger stock alert check
 * Can be called periodically or after stock operations
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
    const lowStockThreshold = body.lowStockThreshold || 10;

    await checkStockAlerts(lowStockThreshold);

    return NextResponse.json({
      success: true,
      message: 'Stock alerts checked successfully',
    });
  } catch (error) {
    console.error('Check stock alerts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

