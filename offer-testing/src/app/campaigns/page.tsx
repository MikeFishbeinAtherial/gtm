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
  account_id: string | null
  account_name: string | null
  account_ids: string[] // All unique account_ids from send_queue for this campaign
  account_names: string[] // All unique account names
  created_at: string | null
  first_send_at: string | null
  last_send_at: string | null
  total_sent: number | null
  total_replied: number | null
  total_meetings: number | null
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
  account_name: string | null // Networking doesn't track accounts, but we show "—"
  account_names: string[]
  created_at: string | null
  first_send_at: string | null
  last_send_at: string | null
  total_sent: number
  total_replied: number | null
  total_meetings: number | null
  source: 'networking'
}

type CampaignRow = ColdRow | NetworkingRow

export default async function CampaignsPage() {
  // ——— 1) Cold: campaigns table with account info ———
  const { data: coldData, error: coldError } = await supabaseAdmin
    .from('campaigns')
    .select('id, name, status, channel, campaign_type, total_contacts, contacts_sent, send_window_start, send_window_end, account_id, created_at, first_send_at, last_send_at, total_sent, total_replied, total_meetings, accounts(name)')
    .order('created_at', { ascending: false })

  const coldIds = (coldData || []).map((r: any) => r.id)
  let accountMapByCampaign: Record<string, { ids: Set<string>; names: Set<string> }> = {}

  // Get all unique account_ids from send_queue for these campaigns
  if (coldIds.length > 0) {
    const { data: queueAccounts } = await supabaseAdmin
      .from('send_queue')
      .select('campaign_id, account_id, accounts(name)')
      .in('campaign_id', coldIds)
      .not('account_id', 'is', null)

    if (queueAccounts) {
      queueAccounts.forEach((r: any) => {
        const cid = r.campaign_id
        if (!accountMapByCampaign[cid]) accountMapByCampaign[cid] = { ids: new Set(), names: new Set() }
        if (r.account_id) accountMapByCampaign[cid].ids.add(r.account_id)
        if (r.accounts?.name) accountMapByCampaign[cid].names.add(r.accounts.name)
      })
    }
  }

  const cold: ColdRow[] = (coldData || []).map((r: any) => {
    const acctMap = accountMapByCampaign[r.id] || { ids: new Set(), names: new Set() }
    const campaignAccount = r.accounts
    if (campaignAccount?.name) acctMap.names.add(campaignAccount.name)
    if (r.account_id) acctMap.ids.add(r.account_id)
    return {
      id: r.id,
      name: r.name,
      status: r.status,
      channel: r.channel,
      campaign_type: r.campaign_type,
      total_contacts: r.total_contacts,
      contacts_sent: r.contacts_sent,
      send_window_start: r.send_window_start,
      send_window_end: r.send_window_end,
      account_id: r.account_id,
      account_name: campaignAccount?.name || null,
      account_ids: Array.from(acctMap.ids),
      account_names: Array.from(acctMap.names),
      created_at: r.created_at,
      first_send_at: r.first_send_at,
      last_send_at: r.last_send_at,
      total_sent: r.total_sent,
      total_replied: r.total_replied,
      total_meetings: r.total_meetings,
      source: 'cold',
    }
  })

  // ——— 2) Networking: networking_campaign_batches + counts from networking_outreach ———
  const { data: batchData } = await supabaseAdmin
    .from('networking_campaign_batches')
    .select('id, name, slug, status, sent_count, created_at')
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

  // Get first/last send times for networking batches
  const batchIdsForTimes = (batchData || []).map((b: any) => b.id)
  let firstLastByBatch: Record<string, { first: string | null; last: string | null }> = {}
  if (batchIdsForTimes.length > 0) {
    const { data: sentRows } = await supabaseAdmin
      .from('networking_outreach')
      .select('batch_id, sent_at')
      .eq('status', 'sent')
      .in('batch_id', batchIdsForTimes)
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: true })

    if (sentRows) {
      sentRows.forEach((r: any) => {
        const bid = r.batch_id
        if (!firstLastByBatch[bid]) firstLastByBatch[bid] = { first: null, last: null }
        if (!firstLastByBatch[bid].first) firstLastByBatch[bid].first = r.sent_at
        firstLastByBatch[bid].last = r.sent_at
      })
    }
  }

  const networking: NetworkingRow[] = (batchData || []).map((b: any) => {
    const c = countsByBatch[b.id] || { sent: 0, pending: 0, failed: 0, skipped: 0 }
    const total = c.sent + c.pending + c.failed + c.skipped
    const times = firstLastByBatch[b.id] || { first: null, last: null }
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
      account_name: null,
      account_names: [],
      created_at: b.created_at,
      first_send_at: times.first,
      last_send_at: times.last,
      total_sent: c.sent,
      total_replied: null,
      total_meetings: null,
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

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem', fontWeight: '600' }}>Campaign</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem', fontWeight: '600' }}>Type</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem', fontWeight: '600' }}>Channel</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem', fontWeight: '600' }}>Progress</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem', fontWeight: '600' }}>Account(s)</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem', fontWeight: '600' }}>Sent</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem', fontWeight: '600' }}>Replies</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem', fontWeight: '600' }}>Meetings</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem', fontWeight: '600' }}>First Send</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem', fontWeight: '600' }}>Last Send</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem', fontWeight: '600' }}>Status</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem', fontWeight: '600' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => {
            const coldRow = c.source === 'cold' ? (c as ColdRow) : null
            const netRow = c.source === 'networking' ? (c as NetworkingRow) : null
            const accountNames = coldRow?.account_names || netRow?.account_names || []
            const firstSend = coldRow?.first_send_at || netRow?.first_send_at
            const lastSend = coldRow?.last_send_at || netRow?.last_send_at
            const totalSent = coldRow?.total_sent ?? netRow?.total_sent ?? 0
            const totalReplied = coldRow?.total_replied ?? netRow?.total_replied ?? null
            const totalMeetings = coldRow?.total_meetings ?? netRow?.total_meetings ?? null

            return (
              <tr key={`${c.source}-${c.id}`} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '0.75rem' }}>
                  <a href={`/campaigns/${c.id}`} style={{ color: '#007bff', textDecoration: 'none' }}>{c.name}</a>
                </td>
                <td style={{ padding: '0.75rem' }}>{c.campaign_type || '—'}</td>
                <td style={{ padding: '0.75rem' }}>{c.channel}</td>
                <td style={{ padding: '0.75rem' }}>
                  <strong>{c.contacts_sent ?? 0}</strong>/{c.total_contacts ?? 0}
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                  {accountNames.length > 0 ? (
                    <div>
                      {accountNames.map((name, i) => (
                        <div key={i}>{name}</div>
                      ))}
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td style={{ padding: '0.75rem' }}>{totalSent.toLocaleString()}</td>
                <td style={{ padding: '0.75rem' }}>{totalReplied != null ? totalReplied.toLocaleString() : '—'}</td>
                <td style={{ padding: '0.75rem' }}>{totalMeetings != null ? totalMeetings.toLocaleString() : '—'}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
                  {firstSend ? new Date(firstSend).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
                  {lastSend ? new Date(lastSend).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: c.status === 'active' || c.status === 'in_progress' ? '#d4edda' : '#f8d7da', color: c.status === 'active' || c.status === 'in_progress' ? '#155724' : '#721c24', fontSize: '0.85rem' }}>
                    {c.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  {c.source === 'cold' && (c as ColdRow).status === 'active' ? (
                    <form action="/api/campaigns/update-status" method="post" style={{ margin: 0 }}>
                      <input type="hidden" name="campaign_id" value={c.id} />
                      <input type="hidden" name="status" value="paused" />
                      <button type="submit" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>Pause</button>
                    </form>
                  ) : c.source === 'cold' ? (
                    <form action="/api/campaigns/update-status" method="post" style={{ margin: 0 }}>
                      <input type="hidden" name="campaign_id" value={c.id} />
                      <input type="hidden" name="status" value="active" />
                      <button type="submit" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>Resume</button>
                    </form>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </main>
  )
}
