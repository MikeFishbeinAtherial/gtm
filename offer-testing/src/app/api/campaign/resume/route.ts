import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/campaign/resume
 * 
 * Resumes the networking campaign.
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
      message: 'Campaign resumed successfully. The sender will pick up pending messages.'
    });

  } catch (error: any) {
    console.error('Error resuming campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resume campaign' },
      { status: 500 }
    );
  }
}

