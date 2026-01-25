import { supabaseAdmin } from '@/lib/clients/supabase'

type LeadRow = {
  contact_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  title: string | null
  company_name: string | null
  company_priority: string | null
  fit_score: number | null
  source_tool: string | null
  signals: Record<string, unknown> | null
  scheduled_for: string | null
  queue_status: string | null
  queue_id: string | null
  eligible_for_outreach: boolean | null
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return date.toLocaleString()
}

function formatSignals(signals?: Record<string, unknown> | null) {
  if (!signals) return '—'
  const keys = Object.keys(signals)
  if (keys.length === 0) return '—'
  return keys.slice(0, 3).join(', ')
}

export default async function LeadsPage() {
  // Fetch a compact Clay-style view for review
  const { data, error } = await supabaseAdmin
    .from('leads_for_review')
    .select(
      'contact_id, first_name, last_name, email, title, company_name, company_priority, fit_score, source_tool, signals, scheduled_for, queue_status, queue_id, eligible_for_outreach'
    )
    .order('fit_score', { ascending: false })
    .limit(100)

  const leads = (data || []) as LeadRow[]

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Leads Review</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        This table shows leads ready for review, their signals, and any scheduled outreach.
      </p>

      {error && (
        <p style={{ color: 'crimson', marginBottom: '1rem' }}>
          Failed to load leads: {error.message}
        </p>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Contact</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Company</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Title</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Signals</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Scheduled</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Status</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const contactName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown'
            return (
              <tr key={lead.contact_id}>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 600 }}>{contactName}</div>
                  <div style={{ color: '#666', fontSize: '0.9rem' }}>{lead.email || 'No email'}</div>
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                  <div>{lead.company_name || 'Unknown'}</div>
                  <div style={{ color: '#666', fontSize: '0.9rem' }}>
                    Priority: {lead.company_priority || '—'} | Fit: {lead.fit_score ?? '—'}
                  </div>
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                  {lead.title || '—'}
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                  {formatSignals(lead.signals)}
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                  {formatDate(lead.scheduled_for)}
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                  {lead.queue_status || '—'}
                  <div style={{ color: '#666', fontSize: '0.85rem' }}>
                    Eligible: {lead.eligible_for_outreach ? 'Yes' : 'No'}
                  </div>
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                  {lead.queue_id ? (
                    <form action="/api/queue/skip" method="post">
                      <input type="hidden" name="queue_id" value={lead.queue_id} />
                      <button type="submit">Skip</button>
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
