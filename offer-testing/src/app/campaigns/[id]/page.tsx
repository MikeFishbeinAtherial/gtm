import { supabaseAdmin } from '@/lib/clients/supabase'

/**
 * Campaign detail: supports both cold (campaigns + send_queue) and
 * networking (networking_campaign_batches + networking_outreach). If
 * campaigns returns null, we try networking_campaign_batches.
 */

type QueueRow = {
  id: string
  scheduled_at: string
  status: string
  channel: string
  contact_name?: string
  contact_email?: string
  company_name?: string
}

type CampaignStats = {
  total_contacts: number
  contacts_sent_to: number
  contacts_pending: number
  pending_messages: number
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' ET'
}

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  // ——— Try cold campaign first ———
  const { data: cold } = await supabaseAdmin
    .from('campaigns')
    .select('id, name, status, channel, campaign_type')
    .eq('id', params.id)
    .single()

  if (cold) {
    return <ColdCampaignDetail id={params.id} campaign={cold} />
  }

  // ——— Try networking batch ———
  const { data: net } = await supabaseAdmin
    .from('networking_campaign_batches')
    .select('id, name, slug, status, sent_count')
    .eq('id', params.id)
    .single()

  if (net) {
    return <NetworkingCampaignDetail id={params.id} batch={net} />
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Campaign not found</h1>
    </main>
  )
}

// ——— Cold: campaigns + send_queue + outreach_history ———
async function ColdCampaignDetail({ id, campaign }: { id: string; campaign: { id: string; name: string; status: string; channel: string; campaign_type: string | null } }) {
  let stats: CampaignStats = { total_contacts: 0, contacts_sent_to: 0, contacts_pending: 0, pending_messages: 0 }
  try {
    const r = await supabaseAdmin.rpc('get_campaign_stats', { campaign_id: id })
    if (r.data) stats = r.data as CampaignStats
  } catch {
    // manual
    const { count: totalContacts } = await supabaseAdmin.from('campaign_contacts').select('*', { count: 'exact', head: true }).eq('campaign_id', id)
    const { count: sentContacts } = await supabaseAdmin.from('outreach_history').select('*', { count: 'exact', head: true }).eq('campaign_id', id).in('status', ['sent', 'delivered'])
    const { data: pendingList } = await supabaseAdmin.from('send_queue').select('id').eq('campaign_id', id).eq('status', 'pending')
    stats = {
      total_contacts: totalContacts || 0,
      contacts_sent_to: sentContacts || 0,
      contacts_pending: pendingList?.length || 0,
      pending_messages: pendingList?.length || 0,
    }
  }

  const { data: queueData } = await supabaseAdmin
    .from('send_queue')
    .select('id, scheduled_for, status, channel, contact_id')
    .eq('campaign_id', id)
    .eq('status', 'pending')
    .order('scheduled_for', { ascending: true })
    .limit(20)

  const contactIds = (queueData || []).map((q: any) => q.contact_id)
  const { data: contactsData } = contactIds.length > 0 ? await supabaseAdmin.from('contacts').select('id, full_name, email, company_id').in('id', contactIds) : { data: [] }
  const companyIds = (contactsData || []).map((c: any) => c.company_id).filter(Boolean)
  const { data: companiesData } = companyIds.length > 0 ? await supabaseAdmin.from('companies').select('id, name').in('id', companyIds) : { data: [] }
  const contactsMap = new Map((contactsData || []).map((c: any) => [c.id, c]))
  const companiesMap = new Map((companiesData || []).map((c: any) => [c.id, c]))

  const items: QueueRow[] = (queueData || []).map((item: any) => {
    const contact = contactsMap.get(item.contact_id)
    const company = contact ? companiesMap.get(contact.company_id) : null
    return {
      id: item.id,
      scheduled_at: item.scheduled_for,
      status: item.status,
      channel: item.channel,
      contact_name: contact?.full_name || '—',
      contact_email: contact?.email || '—',
      company_name: company?.name || '—',
    }
  })

  const sentPct = stats.total_contacts > 0 ? Math.round((stats.contacts_sent_to / stats.total_contacts) * 100) : 0

  return (
    <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{campaign.name}</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Status: <strong>{campaign.status}</strong> | Type: <strong>{campaign.campaign_type || '—'}</strong> | Channel: <strong>{campaign.channel}</strong>
      </p>
      <StatsBlob stats={stats} sentPct={sentPct} />
      <QueueTable items={items} scheduledKey="scheduled_at" />
    </main>
  )
}

// ——— Networking: networking_campaign_batches + networking_outreach ———
async function NetworkingCampaignDetail({ id, batch }: { id: string; batch: { id: string; name: string; slug: string | null; status: string; sent_count: number } }) {
  const { data: rows } = await supabaseAdmin.from('networking_outreach').select('batch_id, status').eq('batch_id', id)
  const counts = (rows || []).reduce(
    (acc: Record<string, number>, r: any) => {
      acc[r.status] = (acc[r.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
  const sent = counts.sent ?? batch.sent_count ?? 0
  const pending = counts.pending ?? 0
  const failed = counts.failed ?? 0
  const skipped = counts.skipped ?? 0
  const total = sent + pending + failed + skipped

  const stats: CampaignStats = {
    total_contacts: total,
    contacts_sent_to: sent,
    contacts_pending: pending,
    pending_messages: pending,
  }
  const sentPct = total > 0 ? Math.round((sent / total) * 100) : 0

  const { data: outreach } = await supabaseAdmin
    .from('networking_outreach')
    .select(`
      id, scheduled_at, status,
      linkedin_connections(full_name, current_company)
    `)
    .eq('batch_id', id)
    .eq('status', 'pending')
    .order('scheduled_at', { ascending: true })
    .limit(20)

  const items: QueueRow[] = (outreach || []).map((r: any) => {
    const conn = r.linkedin_connections
    return {
      id: r.id,
      scheduled_at: r.scheduled_at,
      status: r.status,
      channel: 'linkedin',
      contact_name: conn?.full_name || '—',
      contact_email: '—',
      company_name: conn?.current_company || '—',
    }
  })

  return (
    <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{batch.name}</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Status: <strong>{batch.status}</strong> | Type: <strong>networking</strong> | Channel: <strong>linkedin</strong>
      </p>
      <StatsBlob stats={stats} sentPct={sentPct} />
      <QueueTable items={items} scheduledKey="scheduled_at" />
    </main>
  )
}

function StatsBlob({ stats, sentPct }: { stats: CampaignStats; sentPct: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
      <div><div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>Total</div><div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333' }}>{stats.total_contacts.toLocaleString()}</div></div>
      <div><div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>Sent</div><div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>{stats.contacts_sent_to.toLocaleString()}</div><div style={{ fontSize: '0.85rem', color: '#666' }}>{sentPct}%</div></div>
      <div><div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>Pending</div><div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc107' }}>{stats.contacts_pending.toLocaleString()}</div></div>
      <div><div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>Remaining</div><div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6c757d' }}>{(stats.total_contacts - stats.contacts_sent_to - stats.contacts_pending).toLocaleString()}</div></div>
    </div>
  )
}

function QueueTable({ items, scheduledKey }: { items: QueueRow[]; scheduledKey: 'scheduled_at' }) {
  return (
    <>
      <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>Sample Pending ({items.length})</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem' }}>Scheduled (ET)</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem' }}>Contact</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem' }}>Company</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem' }}>Email</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem' }}>Channel</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No pending messages</td></tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '0.75rem' }}>{formatDate((item as any)[scheduledKey])}</td>
                <td style={{ padding: '0.75rem', fontWeight: '500' }}>{item.contact_name}</td>
                <td style={{ padding: '0.75rem', color: '#666' }}>{item.company_name}</td>
                <td style={{ padding: '0.75rem', color: '#666' }}>{item.contact_email}</td>
                <td style={{ padding: '0.75rem' }}><span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: item.channel === 'email' ? '#e3f2fd' : '#f3e5f5', fontSize: '0.85rem' }}>{item.channel}</span></td>
                <td style={{ padding: '0.75rem' }}><span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: '#fff3cd', color: '#856404', fontSize: '0.85rem' }}>{item.status}</span></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  )
}
