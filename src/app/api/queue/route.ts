import { NextRequest, NextResponse } from 'next/server';
import {
  addToQueue,
  processQueue,
  getQueueStatus,
} from '@/lib/email/queue';

export async function GET() {
  try {
    const status = await getQueueStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, prospectId, draftId } = body as {
      action: 'add' | 'process';
      prospectId?: string;
      draftId?: string;
    };

    if (action === 'add') {
      if (!prospectId || !draftId) {
        return NextResponse.json(
          { error: 'Prospect ID and Draft ID required' },
          { status: 400 }
        );
      }

      const result = await addToQueue(prospectId, draftId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        scheduledAt: result.scheduledAt,
      });
    }

    if (action === 'process') {
      const result = await processQueue();
      return NextResponse.json({
        ok: true,
        processed: result.processed,
        successCount: result.success,
        failed: result.failed,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error with queue operation:', error);
    return NextResponse.json(
      { error: 'Queue operation failed' },
      { status: 500 }
    );
  }
}
