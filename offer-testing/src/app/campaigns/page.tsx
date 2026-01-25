import { supabaseAdmin } from '@/lib/clients/supabase'

type CampaignRow = {
  id: string
  name: string
  status: string
  channel: string
  campaign_type: string | null
  total_contacts: number | null
  contacts_sent: number | null
  send_window_start: string | null
  send_window_end: string | null
}

export default async function CampaignsPage() {
  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .select('id, name, status, channel, campaign_type, total_contacts, contacts_sent, send_window_start, send_window_end')
    .order('created_at', { ascending: false })

  const campaigns = (data || []) as CampaignRow[]

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Campaigns</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        View all campaigns, their status, and quick pause/resume controls.
      </p>

      {error && (
        <p style={{ color: 'crimson', marginBottom: '1rem' }}>
          Failed to load campaigns: {error.message}
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
          {campaigns.map((campaign) => (
            <tr key={campaign.id}>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                <a href={`/campaigns/${campaign.id}`}>{campaign.name}</a>
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {campaign.campaign_type || '—'}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {campaign.channel}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {campaign.contacts_sent ?? 0}/{campaign.total_contacts ?? 0}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {campaign.send_window_start || '—'} - {campaign.send_window_end || '—'}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {campaign.status}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {campaign.status === 'active' ? (
                  <form action="/api/campaigns/update-status" method="post">
                    <input type="hidden" name="campaign_id" value={campaign.id} />
                    <input type="hidden" name="status" value="paused" />
                    <button type="submit">Pause</button>
                  </form>
                ) : (
                  <form action="/api/campaigns/update-status" method="post">
                    <input type="hidden" name="campaign_id" value={campaign.id} />
                    <input type="hidden" name="status" value="active" />
                    <button type="submit">Resume</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
