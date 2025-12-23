import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/campaign/start
 * 
 * Sets the campaign status to 'in_progress' so the worker can start sending.
 * 
 * Note: This doesn't actually start a process. Instead, it updates the campaign
 * status in Supabase. The worker process (campaign-worker.js) checks this status
 * and will start sending when it sees 'in_progress'.
 * 
 * To run the worker on Railway:
 *   railway run node scripts/campaign-worker.js
 * 
 * Or set Railway's start command to:
 *   node scripts/campaign-worker.js
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY 
      || process.env.SUPABASE_SECRET_KEY 
      || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('networking_campaign_batches')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('name', 'networking-holidays-2025');

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Campaign status set to in_progress. The worker will start sending when it checks for messages.',
      note: 'Make sure the worker is running: railway run node scripts/campaign-worker.js'
    });

  } catch (error: any) {
    console.error('Error starting campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start campaign' },
      { status: 500 }
    );
  }
}

