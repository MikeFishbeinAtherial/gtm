import { supabaseAdmin } from '@/lib/clients/supabase'

type QueueRow = {
  id: string
  scheduled_for: string
  channel: string
  status: string
  contact_name: string | null
  contact_email: string | null
  company_name: string | null
  account_name: string | null
  campaign_name: string | null
}

function formatDate(value: string) {
  const date = new Date(value)
  return date.toLocaleString()
}

export default async function QueuePage() {
  const { data, error } = await supabaseAdmin
    .from('todays_schedule')
    .select('*')
    .order('scheduled_for', { ascending: true })

  const rows = (data || []) as QueueRow[]

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Today&apos;s Send Queue</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        This view shows every message scheduled for today, grouped by time.
      </p>

      {error && (
        <p style={{ color: 'crimson', marginBottom: '1rem' }}>
          Failed to load queue: {error.message}
        </p>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Time</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Contact</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Company</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Channel</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Campaign</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Account</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Status</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {formatDate(row.scheduled_for)}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                <div>{row.contact_name || 'Unknown'}</div>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>{row.contact_email || 'No email'}</div>
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
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                <form action="/api/queue/skip" method="post">
                  <input type="hidden" name="queue_id" value={row.id} />
                  <button type="submit">Skip</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
