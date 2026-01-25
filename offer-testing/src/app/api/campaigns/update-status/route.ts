import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/campaigns/update-status
 *
 * Updates a campaign status (active/paused).
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    let campaignId: string | null = null
    let status: string | null = null
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await request.json()
      campaignId = body.campaign_id || body.campaignId || null
      status = body.status || null
    } else {
      const form = await request.formData()
      campaignId = (form.get('campaign_id') as string) || null
      status = (form.get('status') as string) || null
    }

    if (!campaignId || !status) {
      return NextResponse.json({ error: 'Missing campaign_id or status' }, { status: 400 })
    }

    const allowedStatuses = ['draft', 'ready', 'active', 'paused', 'completed', 'cancelled']
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    const { error } = await supabase
      .from('campaigns')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update campaign' }, { status: 500 })
  }
}
