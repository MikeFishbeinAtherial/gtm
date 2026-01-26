import { supabaseAdmin } from '@/lib/clients/supabase'

/**
 * CAMPAIGNS PAGE – SOURCES (exhaustive list)
 *
 * We show both:
 * 1) COLD campaigns: from `campaigns` (cold_outreach, email/linkedin, send_queue, outreach_history)
 * 2) NETWORKING campaigns: from `networking_campaign_batches` (LinkedIn, networking_outreach)
 *
 * Rows are merged into one list. Progress and Send Window for networking use batch-level data
 * and outreach counts; Pause/Resume for networking is not wired (API targets `campaigns` only).
 */

type ColdRow = {
  id: string
  name: string
  status: string
  channel: string
  campaign_type: string | null
  total_contacts: number | null
  contacts_sent: number | null
  send_window_start: string | null
  send_window_end: string | null
  source: 'cold'
}

type NetworkingRow = {
  id: string
  name: string
  slug: string | null
  status: string
  channel: string
  campaign_type: string
  total_contacts: number
  contacts_sent: number
  send_window_start: string | null
  send_window_end: string | null
  source: 'networking'
}

type CampaignRow = ColdRow | NetworkingRow

export default async function CampaignsPage() {
  // ——— 1) Cold: campaigns table ———
  const { data: coldData, error: coldError } = await supabaseAdmin
    .from('campaigns')
    .select('id, name, status, channel, campaign_type, total_contacts, contacts_sent, send_window_start, send_window_end')
    .order('created_at', { ascending: false })

  const cold: ColdRow[] = (coldData || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    channel: r.channel,
    campaign_type: r.campaign_type,
    total_contacts: r.total_contacts,
    contacts_sent: r.contacts_sent,
    send_window_start: r.send_window_start,
    send_window_end: r.send_window_end,
    source: 'cold',
  }))

  // ——— 2) Networking: networking_campaign_batches + counts from networking_outreach ———
  const { data: batchData } = await supabaseAdmin
    .from('networking_campaign_batches')
    .select('id, name, slug, status, sent_count')
    .order('created_at', { ascending: false })

  const batchIds = (batchData || []).map((b: any) => b.id)
  let countsByBatch: Record<string, { sent: number; pending: number; failed: number; skipped: number }> = {}

  if (batchIds.length > 0) {
    const { data: outreachRows } = await supabaseAdmin
      .from('networking_outreach')
      .select('batch_id, status')
      .in('batch_id', batchIds)

    countsByBatch = (outreachRows || []).reduce(
      (acc: Record<string, { sent: number; pending: number; failed: number; skipped: number }>, r: any) => {
        const id = r.batch_id
        if (!acc[id]) acc[id] = { sent: 0, pending: 0, failed: 0, skipped: 0 }
        if (r.status === 'sent') acc[id].sent += 1
        else if (r.status === 'pending') acc[id].pending += 1
        else if (r.status === 'failed') acc[id].failed += 1
        else if (r.status === 'skipped') acc[id].skipped += 1
        return acc
      },
      {}
    )
  }

  const networking: NetworkingRow[] = (batchData || []).map((b: any) => {
    const c = countsByBatch[b.id] || { sent: 0, pending: 0, failed: 0, skipped: 0 }
    const total = c.sent + c.pending + c.failed + c.skipped
    return {
      id: b.id,
      name: b.name,
      slug: b.slug,
      status: b.status,
      channel: 'linkedin',
      campaign_type: 'networking',
      total_contacts: total,
      contacts_sent: b.sent_count ?? c.sent,
      send_window_start: null,
      send_window_end: null,
      source: 'networking',
    }
  })

  const campaigns: CampaignRow[] = [...cold, ...networking]

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Campaigns</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        All campaigns: cold (campaigns + send_queue) and networking (networking_campaign_batches + networking_outreach).
      </p>

      {coldError && (
        <p style={{ color: 'crimson', marginBottom: '1rem' }}>
          Failed to load cold campaigns: {coldError.message}
        </p>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Campaign</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Type</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Channel</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Progress</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Send Window</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Status</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={`${c.source}-${c.id}`}>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                <a href={`/campaigns/${c.id}`}>{c.name}</a>
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {c.campaign_type || '—'}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {c.channel}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {c.contacts_sent ?? 0}/{c.total_contacts ?? 0}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {c.send_window_start != null && c.send_window_end != null
                  ? `${c.send_window_start} - ${c.send_window_end}`
                  : '—'}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {c.status}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {c.source === 'cold' && (c as ColdRow).status === 'active' ? (
                  <form action="/api/campaigns/update-status" method="post">
                    <input type="hidden" name="campaign_id" value={c.id} />
                    <input type="hidden" name="status" value="paused" />
                    <button type="submit">Pause</button>
                  </form>
                ) : c.source === 'cold' ? (
                  <form action="/api/campaigns/update-status" method="post">
                    <input type="hidden" name="campaign_id" value={c.id} />
                    <input type="hidden" name="status" value="active" />
                    <button type="submit">Resume</button>
                  </form>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
