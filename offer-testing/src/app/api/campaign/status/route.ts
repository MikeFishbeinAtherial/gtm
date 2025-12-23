import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/campaign/status
 * 
 * Returns the current status of the networking campaign.
 */
export async function GET(request: NextRequest) {
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

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('networking_campaign_batches')
      .select('*')
      .eq('name', 'networking-holidays-2025')
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get outreach stats
    const { data: outreachStats, error: statsError } = await supabase
      .from('networking_outreach')
      .select('status')
      .eq('batch_id', campaign.id);

    if (statsError) {
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      );
    }

    const statusCounts = outreachStats.reduce((acc: any, row: any) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        total_target_count: campaign.total_target_count,
        sent_count: campaign.sent_count,
        reply_count: campaign.reply_count,
        started_at: campaign.started_at,
        completed_at: campaign.completed_at,
        updated_at: campaign.updated_at
      },
      stats: {
        pending: statusCounts.pending || 0,
        sent: statusCounts.sent || 0,
        failed: statusCounts.failed || 0,
        replied: statusCounts.replied || 0,
        skipped: statusCounts.skipped || 0
      },
      progress: {
        total: campaign.total_target_count,
        sent: statusCounts.sent || 0,
        remaining: statusCounts.pending || 0,
        percent_complete: campaign.total_target_count > 0
          ? ((statusCounts.sent || 0) / campaign.total_target_count * 100).toFixed(1)
          : '0'
      }
    });

  } catch (error: any) {
    console.error('Error fetching campaign status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch status' },
      { status: 500 }
    );
  }
}

