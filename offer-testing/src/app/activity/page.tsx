import { supabaseAdmin } from '@/lib/clients/supabase'

type ActivityRow = {
  activity_type: string
  item_id: string
  occurred_at: string
  status: string
  channel: string
  contact_name: string | null
  contact_email: string | null
  contact_linkedin_url: string | null
  company_name: string | null
  campaign_name: string | null
  account_name: string | null
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

export default async function ActivityPage() {
  const { data, error } = await supabaseAdmin
    .from('activity_feed')
    .select('*')
    .order('occurred_at', { ascending: false })
    .limit(200)

  const rows = (data || []) as ActivityRow[]

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Activity Feed</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        This feed shows scheduled and sent messages in one timeline.
      </p>

      {error && (
        <p style={{ color: 'crimson', marginBottom: '1rem' }}>
          Failed to load activity: {error.message}
        </p>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Time</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Type</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Contact</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Company</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Channel</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Campaign</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Account</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.activity_type}-${row.item_id}`}>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {formatDate(row.occurred_at)}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {row.activity_type}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                <div>{row.contact_name || 'Unknown'}</div>
                <div style={{ color: '#666', fontSize: '0.85rem' }}>
                  {row.contact_email || row.contact_linkedin_url || '—'}
                </div>
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {row.company_name || '—'}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {row.channel}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {row.campaign_name || '—'}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {row.account_name || '—'}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {row.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
