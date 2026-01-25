import { supabaseAdmin } from '@/lib/clients/supabase'

type Campaign = {
  id: string
  name: string
  status: string
  channel: string
  campaign_type: string | null
}

type QueueRow = {
  id: string
  scheduled_for: string
  status: string
  channel: string
  contact_id: string
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
  return new Date(value).toLocaleString()
}

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('id, name, status, channel, campaign_type')
    .eq('id', params.id)
    .single()

  if (!campaign) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Campaign not found</h1>
      </main>
    )
  }

  // Get campaign stats
  const { data: statsData } = await supabaseAdmin.rpc('get_campaign_stats', {
    campaign_id: params.id
  }).catch(() => ({ data: null }))

  // If RPC doesn't exist, calculate manually
  let stats: CampaignStats = {
    total_contacts: 0,
    contacts_sent_to: 0,
    contacts_pending: 0,
    pending_messages: 0
  }

  if (!statsData) {
    // Manual calculation
    const { count: totalContacts } = await supabaseAdmin
      .from('campaign_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', params.id)

    const { count: sentContacts } = await supabaseAdmin
      .from('outreach_history')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', params.id)
      .in('status', ['sent', 'delivered'])

    const { data: pendingQueue } = await supabaseAdmin
      .from('send_queue')
      .select('contact_id', { count: 'exact' })
      .eq('campaign_id', params.id)
      .eq('status', 'pending')

    stats = {
      total_contacts: totalContacts || 0,
      contacts_sent_to: sentContacts || 0,
      contacts_pending: pendingQueue?.length || 0,
      pending_messages: pendingQueue?.length || 0
    }
  } else {
    stats = statsData as CampaignStats
  }

  // Get pending queue items - use a view or simple query
  const { data: queueData } = await supabaseAdmin
    .from('send_queue')
    .select('id, scheduled_for, status, channel, contact_id')
    .eq('campaign_id', params.id)
    .eq('status', 'pending')
    .order('scheduled_for', { ascending: true })
    .limit(20)

  // Get contact details for the queue items
  const contactIds = (queueData || []).map((q: any) => q.contact_id)
  const { data: contactsData } = contactIds.length > 0 ? await supabaseAdmin
    .from('contacts')
    .select('id, full_name, email, company_id')
    .in('id', contactIds) : { data: [] }

  // Get company names
  const companyIds = (contactsData || []).map((c: any) => c.company_id).filter(Boolean)
  const { data: companiesData } = companyIds.length > 0 ? await supabaseAdmin
    .from('companies')
    .select('id, name')
    .in('id', companyIds) : { data: [] }

  // Combine the data
  const contactsMap = new Map((contactsData || []).map((c: any) => [c.id, c]))
  const companiesMap = new Map((companiesData || []).map((c: any) => [c.id, c]))

  const items = (queueData || []).map((item: any) => {
    const contact = contactsMap.get(item.contact_id)
    const company = contact ? companiesMap.get(contact.company_id) : null
    return {
      id: item.id,
      scheduled_for: item.scheduled_for,
      status: item.status,
      channel: item.channel,
      contact_id: item.contact_id,
      contact_name: contact?.full_name || '—',
      contact_email: contact?.email || '—',
      company_name: company?.name || '—'
    }
  }) as QueueRow[]

  const sentPercentage = stats.total_contacts > 0 
    ? Math.round((stats.contacts_sent_to / stats.total_contacts) * 100) 
    : 0

  return (
    <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{campaign.name}</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Status: <strong>{campaign.status}</strong> | Type: <strong>{campaign.campaign_type || '—'}</strong> | Channel: <strong>{campaign.channel}</strong>
      </p>

      {/* Campaign Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem',
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <div>
          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>Total Contacts</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333' }}>
            {stats.total_contacts.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>Sent To</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
            {stats.contacts_sent_to.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#666' }}>{sentPercentage}% complete</div>
        </div>
        <div>
          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>Pending</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc107' }}>
            {stats.contacts_pending.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#666' }}>
            {stats.pending_messages.toLocaleString()} messages
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>Remaining</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6c757d' }}>
            {(stats.total_contacts - stats.contacts_sent_to - stats.contacts_pending).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Sample Pending Contacts */}
      <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>Sample Pending Contacts ({items.length} shown)</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem' }}>Scheduled Time</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem' }}>Contact Name</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem' }}>Company</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem' }}>Email</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem' }}>Channel</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.75rem' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                No pending messages
              </td>
            </tr>
          ) : (
            items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '0.75rem' }}>
                  {formatDate(item.scheduled_for)}
                </td>
                <td style={{ padding: '0.75rem', fontWeight: '500' }}>
                  {item.contact_name}
                </td>
                <td style={{ padding: '0.75rem', color: '#666' }}>
                  {item.company_name}
                </td>
                <td style={{ padding: '0.75rem', color: '#666' }}>
                  {item.contact_email}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px',
                    backgroundColor: item.channel === 'email' ? '#e3f2fd' : '#f3e5f5',
                    fontSize: '0.85rem'
                  }}>
                    {item.channel}
                  </span>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px',
                    backgroundColor: '#fff3cd',
                    color: '#856404',
                    fontSize: '0.85rem'
                  }}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {items.length >= 20 && (
        <p style={{ marginTop: '1rem', color: '#666', fontSize: '0.9rem' }}>
          Showing first 20 pending messages. View all in <a href="/queue" style={{ color: '#007bff' }}>Queue page</a>.
        </p>
      )}
    </main>
  )
}
