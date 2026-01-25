import { supabaseAdmin } from '@/lib/clients/supabase'

type AccountRow = {
  id: string
  name: string
  type: string
  health_score: number | null
  status: string
  today_emails: number
  today_connections: number
  today_messages: number
  daily_limit_emails: number
  daily_limit_connections: number
  daily_limit_messages: number
  emails_remaining: number
  connections_remaining: number
  messages_remaining: number
  can_send_now: boolean
}

export default async function AccountsPage() {
  const { data, error } = await supabaseAdmin
    .from('account_capacity')
    .select('*')
    .order('type', { ascending: true })
    .order('health_score', { ascending: false })

  const accounts = (data || []) as AccountRow[]

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Account Health</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        This table summarizes account safety limits, health scores, and remaining capacity.
      </p>

      {error && (
        <p style={{ color: 'crimson', marginBottom: '1rem' }}>
          Failed to load accounts: {error.message}
        </p>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Account</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Type</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Health</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Today</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Remaining</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Can Send</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id}>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {account.name}
                <div style={{ color: '#666', fontSize: '0.85rem' }}>{account.status}</div>
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {account.type}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {account.health_score ?? '—'}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                <div>Email: {account.today_emails}/{account.daily_limit_emails}</div>
                <div>Connections: {account.today_connections}/{account.daily_limit_connections}</div>
                <div>Messages: {account.today_messages}/{account.daily_limit_messages}</div>
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                <div>Email: {account.emails_remaining}</div>
                <div>Connections: {account.connections_remaining}</div>
                <div>Messages: {account.messages_remaining}</div>
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                {account.can_send_now ? 'Yes' : 'No'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
