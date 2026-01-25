import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/queue/skip
 *
 * Marks a send_queue item as skipped for safety.
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

    // Support both form posts and JSON
    let queueId: string | null = null
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await request.json()
      queueId = body.queue_id || body.queueId || null
    } else {
      const form = await request.formData()
      queueId = (form.get('queue_id') as string) || null
    }

    if (!queueId) {
      return NextResponse.json({ error: 'Missing queue_id' }, { status: 400 })
    }

    // Update queue status
    const { data: queueRow, error: updateError } = await supabase
      .from('send_queue')
      .update({
        status: 'skipped',
        last_error: 'Skipped by user',
        updated_at: new Date().toISOString()
      })
      .eq('id', queueId)
      .select('id, contact_id, campaign_id, account_id')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Record event for visibility
    if (queueRow) {
      await supabase.from('message_events').insert({
        send_queue_id: queueRow.id,
        contact_id: queueRow.contact_id,
        campaign_id: queueRow.campaign_id,
        account_id: queueRow.account_id,
        event_type: 'skipped',
        event_data: { reason: 'Skipped by user' }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to skip queue item' }, { status: 500 })
  }
}
