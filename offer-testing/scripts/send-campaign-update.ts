/**
 * Send campaign update email via Resend
 * Shows messages sent today and schedule for rest of day
 * 
 * Run via cron: 8am and 1pm ET daily
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

const RESEND_API_KEY = process.env.RESEND_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase env')
  process.exit(1)
}

if (!RESEND_API_KEY) {
  console.error('❌ Missing RESEND_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const resend = new Resend(RESEND_API_KEY)

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }) + ' ET'
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

async function main() {
  console.log('\n📧 Generating Campaign Update Email\n')

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  // Get messages sent today
  const { data: sentToday } = await supabase
    .from('messages')
    .select(`
      id,
      subject,
      sent_at,
      personalization_used,
      contact:contacts(first_name, email, companies(name, vertical))
    `)
    .eq('status', 'sent')
    .gte('sent_at', todayStart.toISOString())
    .lte('sent_at', todayEnd.toISOString())
    .order('sent_at', { ascending: true })

  // Get messages scheduled for rest of today
  const { data: scheduledToday } = await supabase
    .from('messages')
    .select(`
      id,
      subject,
      scheduled_at,
      personalization_used,
      contact:contacts(first_name, email, companies(name, vertical))
    `)
    .eq('status', 'pending')
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', todayEnd.toISOString())
    .order('scheduled_at', { ascending: true })

  // Get messages scheduled for tomorrow
  const tomorrowStart = new Date(todayEnd)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  tomorrowStart.setHours(0, 0, 0, 0)
  
  const tomorrowEnd = new Date(tomorrowStart)
  tomorrowEnd.setHours(23, 59, 59, 999)

  const { data: scheduledTomorrow } = await supabase
    .from('messages')
    .select('id, scheduled_at')
    .eq('status', 'pending')
    .gte('scheduled_at', tomorrowStart.toISOString())
    .lte('scheduled_at', tomorrowEnd.toISOString())

  // Get overall campaign stats
  const { data: allMessages } = await supabase
    .from('messages')
    .select('status, personalization_used')

  const stats = {
    total: allMessages?.length || 0,
    sent: allMessages?.filter(m => m.status === 'sent').length || 0,
    pending: allMessages?.filter(m => m.status === 'pending').length || 0,
    failed: allMessages?.filter(m => m.status === 'failed').length || 0,
    replied: allMessages?.filter(m => m.status === 'replied').length || 0
  }

  // Build email HTML
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
    h2 { color: #1f2937; margin-top: 30px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat-card { background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; }
    .stat-number { font-size: 24px; font-weight: bold; color: #2563eb; }
    .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .message-list { margin: 20px 0; }
    .message-item { background: #ffffff; border: 1px solid #e5e7eb; padding: 12px; margin-bottom: 8px; border-radius: 6px; }
    .message-time { font-weight: 600; color: #059669; }
    .message-subject { color: #1f2937; font-weight: 500; }
    .message-contact { color: #6b7280; font-size: 14px; }
    .template-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 8px; }
    .template-v2 { background: #dbeafe; color: #1e40af; }
    .template-v3 { background: #dcfce7; color: #166534; }
    .template-sentiment { background: #fef3c7; color: #92400e; }
    .empty-state { text-align: center; padding: 30px; color: #9ca3af; font-style: italic; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <h1>📊 Campaign Update - ${formatDate(now)}</h1>
  
  <div class="stats">
    <div class="stat-card">
      <div class="stat-number">${stats.sent}</div>
      <div class="stat-label">Sent</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${stats.pending}</div>
      <div class="stat-label">Pending</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${stats.replied}</div>
      <div class="stat-label">Replied</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${stats.failed > 0 ? '⚠️ ' : ''}${stats.failed}</div>
      <div class="stat-label">Failed</div>
    </div>
  </div>

  <h2>📤 Sent Today (${sentToday?.length || 0})</h2>
  <div class="message-list">
    ${sentToday && sentToday.length > 0 ? sentToday.map((m: any) => `
      <div class="message-item">
        <div class="message-time">${formatTime(new Date(m.sent_at))}</div>
        <div class="message-subject">
          "${m.subject}"
          <span class="template-badge template-${m.personalization_used?.Template?.toLowerCase() || 'unknown'}">
            ${m.personalization_used?.Template || 'Unknown'}
          </span>
        </div>
        <div class="message-contact">
          To: ${m.contact?.first_name || 'Unknown'} at ${m.contact?.companies?.name || 'Unknown'} (${m.contact?.companies?.vertical || 'unknown'})
        </div>
      </div>
    `).join('') : '<div class="empty-state">No messages sent yet today</div>'}
  </div>

  <h2>⏰ Scheduled for Rest of Today (${scheduledToday?.length || 0})</h2>
  <div class="message-list">
    ${scheduledToday && scheduledToday.length > 0 ? scheduledToday.map((m: any) => `
      <div class="message-item">
        <div class="message-time">${formatTime(new Date(m.scheduled_at))}</div>
        <div class="message-subject">
          "${m.subject}"
          <span class="template-badge template-${m.personalization_used?.Template?.toLowerCase() || 'unknown'}">
            ${m.personalization_used?.Template || 'Unknown'}
          </span>
        </div>
        <div class="message-contact">
          To: ${m.contact?.first_name || 'Unknown'} at ${m.contact?.companies?.name || 'Unknown'} (${m.contact?.companies?.vertical || 'unknown'})
        </div>
      </div>
    `).join('') : '<div class="empty-state">No more messages scheduled for today</div>'}
  </div>

  <h2>📅 Tomorrow Preview</h2>
  <p style="color: #6b7280;">
    ${scheduledTomorrow && scheduledTomorrow.length > 0 
      ? `${scheduledTomorrow.length} messages scheduled for ${formatDate(new Date(scheduledTomorrow[0].scheduled_at))}`
      : 'No messages scheduled for tomorrow'}
  </p>

  <div class="footer">
    <p>Campaign: Finance Lead Gen 1000</p>
    <p>Generated at ${formatTime(now)} on ${formatDate(now)}</p>
  </div>
</body>
</html>
  `

  // Send via Resend
  console.log('📧 Sending update email via Resend...')
  
  const { data, error } = await resend.emails.send({
    from: 'Campaign Updates <updates@atherial.ai>',
    to: 'mfishbein1@gmail.com',
    subject: `📊 Campaign Update - ${sentToday?.length || 0} sent today, ${scheduledToday?.length || 0} remaining`,
    html: emailHtml
  })

  if (error) {
    console.error('❌ Failed to send email:', error)
    process.exit(1)
  }

  console.log('✅ Update email sent successfully')
  console.log(`   Email ID: ${data?.id}`)
  console.log(`   Sent to: mfishbein1@gmail.com`)
  console.log('')
  console.log('📊 Summary:')
  console.log(`   - ${sentToday?.length || 0} emails sent today`)
  console.log(`   - ${scheduledToday?.length || 0} emails remaining today`)
  console.log(`   - ${scheduledTomorrow?.length || 0} emails scheduled for tomorrow`)
}

main().catch(console.error)
