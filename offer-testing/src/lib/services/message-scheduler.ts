/**
 * Message Scheduler Service
 *
 * Schedules messages with smart spacing to avoid rate limits.
 * Messages are spread out over time instead of being sent immediately.
 */

import { supabaseAdmin } from '@/lib/clients/supabase';

export interface SchedulingConfig {
  daily_limit: number;
  min_interval_minutes: number;
  max_interval_minutes: number;
  business_hours_start: number; // 9 for 9 AM
  business_hours_end: number;   // 17 for 5 PM
  send_days: number[];          // [1,2,3,4,5] for Mon-Fri
}

export interface MessageToSchedule {
  id: string;
  campaign_id: string;
  campaign_contact_id?: string;
  contact_id: string;
  channel: 'linkedin' | 'email' | 'linkedin_connect' | 'linkedin_dm' | 'linkedin_inmail';
  sequence_step?: number;
  subject?: string;
  body: string;
  account_id: string;
  scheduled_at?: string;
  priority?: number;
}

/**
 * Schedule new messages with smart spacing
 */
export async function scheduleNewMessages(
  campaignId: string,
  messages: MessageToSchedule[]
): Promise<void> {
  console.log(`📅 Scheduling ${messages.length} messages for campaign ${campaignId}`);

  // Get campaign config
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('scheduling_config, campaign_type')
    .eq('id', campaignId)
    .single();

  const config: SchedulingConfig = campaign?.scheduling_config || {
    daily_limit: 40,
    min_interval_minutes: 6,
    max_interval_minutes: 16, // Keep spacing between 6-16 minutes
    business_hours_start: 9,
    business_hours_end: 17,
    send_days: [1, 2, 3, 4, 5]
  };

  // Find where to start scheduling (after existing queue items)
  const lastScheduled = await getLastScheduledSlot(messages[0].channel);
  let cursor = lastScheduled?.scheduled_at
    ? new Date(lastScheduled.scheduled_at)
    : new Date();

  console.log(`📅 Starting after: ${cursor.toISOString()}`);

  // Schedule each message
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    // Find next available slot
    cursor = getNextAvailableSlot(cursor, config);

    // Add random jitter
    cursor = addRandomJitter(cursor, config.min_interval_minutes, config.max_interval_minutes);

    message.scheduled_at = cursor.toISOString();

    console.log(`📅 Message ${i + 1}/${messages.length}: ${cursor.toISOString()}`);
  }

  // Insert all messages into the send_queue
  const queueItemsToInsert = messages.map(msg => ({
    id: msg.id,
    campaign_id: msg.campaign_id,
    campaign_contact_id: msg.campaign_contact_id,
    contact_id: msg.contact_id,
    channel: normalizeChannel(msg.channel),
    sequence_step: msg.sequence_step ?? null,
    subject: msg.subject,
    body: msg.body,
    account_id: msg.account_id,
    scheduled_for: msg.scheduled_at,
    priority: msg.priority ?? 5,
    status: 'pending'
  }));

  const { data: queueItems, error } = await supabaseAdmin
    .from('send_queue')
    .insert(queueItemsToInsert)
    .select();

  if (error) {
    console.error('❌ Failed to insert send_queue items:', error);
    throw error;
  }

  // Record queue events for visibility
  if (queueItems && queueItems.length > 0) {
    const events = queueItems.map(item => ({
      send_queue_id: item.id,
      contact_id: item.contact_id,
      campaign_id: item.campaign_id,
      account_id: item.account_id,
      event_type: 'queued',
      event_data: { source: 'message-scheduler' }
    }));

    const { error: eventError } = await supabaseAdmin
      .from('message_events')
      .insert(events);

    if (eventError) {
      console.warn('⚠️ Failed to insert message_events:', eventError);
    }
  }

  console.log(`✅ Successfully scheduled ${messages.length} messages`);
}

/**
 * Find the last scheduled message for a channel to continue from
 */
async function getLastScheduledSlot(channel: string) {
  const { data } = await supabaseAdmin
    .from('send_queue')
    .select('scheduled_for')
    .eq('channel', normalizeChannel(channel))
    .eq('status', 'pending')
    .order('scheduled_for', { ascending: false })
    .limit(1);

  if (!data || data.length === 0) {
    return null;
  }

  return { scheduled_at: data[0].scheduled_for };
}

function normalizeChannel(channel: string) {
  if (channel === 'linkedin') {
    return 'linkedin_dm'
  }

  if (channel === 'email' || channel === 'linkedin_connect' || channel === 'linkedin_dm' || channel === 'linkedin_inmail') {
    return channel
  }

  return 'email'
}

/**
 * Calculate the next available slot respecting business hours and daily limits
 */
function getNextAvailableSlot(currentTime: Date, config: SchedulingConfig): Date {
  let slot = new Date(currentTime);

  // If current time is outside business hours, move to next business hour
  if (!isBusinessHour(slot, config)) {
    slot = getNextBusinessHour(slot, config);
  }

  // Check if we've hit daily limit for this day
  const dayMessages = getEstimatedMessagesForDay(slot, config);
  if (dayMessages >= config.daily_limit) {
    // Move to next day
    slot = getNextBusinessDay(slot, config);
  }

  // Add minimum interval
  slot = new Date(slot.getTime() + (config.min_interval_minutes * 60 * 1000));

  return slot;
}

/**
 * Add random jitter to make timing less predictable
 */
function addRandomJitter(baseTime: Date, minMinutes: number, maxMinutes: number): Date {
  const jitterMinutes = minMinutes + Math.random() * (maxMinutes - minMinutes);
  const jitterMs = Math.round(jitterMinutes * 60 * 1000);
  return new Date(baseTime.getTime() + jitterMs);
}

/**
 * Check if a time is within business hours and on a valid day
 */
function isBusinessHour(time: Date, config: SchedulingConfig): boolean {
  const hour = time.getHours();
  const dayOfWeek = time.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  // Convert our day numbering (1=Mon, 7=Sun) to JS numbering (0=Sun, 1=Mon)
  const jsDay = dayOfWeek === 0 ? 7 : dayOfWeek;

  const isValidDay = config.send_days.includes(jsDay);
  const isBusinessHour = hour >= config.business_hours_start && hour < config.business_hours_end;

  return isValidDay && isBusinessHour;
}

/**
 * Get the next business hour
 */
function getNextBusinessHour(currentTime: Date, config: SchedulingConfig): Date {
  const time = new Date(currentTime);

  // If before business hours today, set to start time
  if (time.getHours() < config.business_hours_start) {
    time.setHours(config.business_hours_start, 0, 0, 0);
    return time;
  }

  // If after business hours today, move to tomorrow
  if (time.getHours() >= config.business_hours_end) {
    time.setDate(time.getDate() + 1);
    time.setHours(config.business_hours_start, 0, 0, 0);
    return getNextBusinessDay(time, config);
  }

  return time;
}

/**
 * Get the next valid business day
 */
function getNextBusinessDay(currentTime: Date, config: SchedulingConfig): Date {
  let time = new Date(currentTime);

  // Keep moving forward until we find a valid day
  while (!config.send_days.includes(getDayNumber(time))) {
    time.setDate(time.getDate() + 1);
  }

  time.setHours(config.business_hours_start, 0, 0, 0);
  return time;
}

/**
 * Convert JS day (0=Sun) to our numbering (1=Mon, 7=Sun)
 */
function getDayNumber(time: Date): number {
  const jsDay = time.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Estimate messages already scheduled for a day (simplified)
 */
function getEstimatedMessagesForDay(day: Date, config: SchedulingConfig): number {
  const startOfDay = new Date(day);
  startOfDay.setHours(config.business_hours_start, 0, 0, 0);

  const endOfDay = new Date(day);
  endOfDay.setHours(config.business_hours_end, 0, 0, 0);

  const hoursAvailable = config.business_hours_end - config.business_hours_start;
  const messagesPerHour = config.daily_limit / hoursAvailable;

  // This is a rough estimate - in production you'd query actual scheduled messages
  return Math.floor(messagesPerHour * (day.getHours() - config.business_hours_start));
}

/**
 * Validate scheduling config
 */
export function validateSchedulingConfig(config: Partial<SchedulingConfig>): SchedulingConfig {
  return {
    daily_limit: Math.max(1, Math.min(config.daily_limit || 40, 100)),
    min_interval_minutes: Math.max(1, Math.min(config.min_interval_minutes || 6, 60)),
    max_interval_minutes: Math.max(config.min_interval_minutes || 6, Math.min(config.max_interval_minutes || 16, 120)),
    business_hours_start: Math.max(0, Math.min(config.business_hours_start || 9, 23)),
    business_hours_end: Math.max(config.business_hours_start || 9, Math.min(config.business_hours_end || 17, 24)),
    send_days: config.send_days || [1, 2, 3, 4, 5]
  };
}
