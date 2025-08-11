import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { getGmailClient, listLabelMessages, extractHeader, parsePdbSubject } from '@/lib/gmail';
import { groupEventsIntoOutages } from '@/lib/outages';

// Gmail system delay constant - emails are sent 187 seconds after actual PDB events
const GMAIL_DELAY_SECONDS = 187;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const accessToken = (session as any).accessToken as string | undefined;
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Gmail access token. Re-login with Google.' }, { status: 400 });
    }

    console.log('Starting sync process...');

    const gmail = getGmailClient(accessToken);
    const user = process.env.GMAIL_USER || 'me';
    const label = process.env.GMAIL_LABEL_NAME || 'PDB Notifications';
    
    console.log('Getting database connection...');
    const db = await getDb();

    console.log('Fetching Gmail messages...');
    // Fetch ALL messages from December 31, 2024 onwards to catch Bangladesh timezone outages  
    const messages = await listLabelMessages(gmail, user, label, 200, '2024/12/31');
    console.log(`Found ${messages.length} messages`);

    // Store raw email events (dedup on messageId)
    const rawEvents: { type: 'down' | 'up'; at: Date; messageId: string }[] = [];
    console.log('Processing email messages...');
    for (const m of messages) {
      const subject = extractHeader(m, 'Subject');
      const type = parsePdbSubject(subject);
      if (!type) continue;

      const dateStr = extractHeader(m, 'Date');
      const messageId = extractHeader(m, 'Message-Id') || m.id || '';
      if (!dateStr || !messageId) continue;
      // Gmail has a 187-second delay in sending emails, so subtract that to get actual outage time
      const emailTimestamp = new Date(dateStr);
      const at = new Date(emailTimestamp.getTime() - GMAIL_DELAY_SECONDS * 1000); // Subtract 187 seconds
      rawEvents.push({ type, at, messageId });

      await db.collection('emails').updateOne(
        { messageId },
        { $setOnInsert: { messageId, subject, date: at, type } },
        { upsert: true }
      );
    }

    console.log(`Processed ${rawEvents.length} raw events`);

    // Recompute outages from all known events in DB
    console.log('Fetching email documents from database...');
    const emailDocs = await db
      .collection('emails')
      .find({ type: { $in: ['down', 'up'] } })
      .project<{ messageId: string; date: Date; type: 'down' | 'up' }>({ messageId: 1, date: 1, type: 1 })
      .toArray();

    console.log(`Found ${emailDocs.length} email documents in database`);

    console.log('Grouping events into outages...');
    const outages = groupEventsIntoOutages(
      emailDocs.map((d) => ({ type: d.type, at: new Date(d.date), messageId: d.messageId }))
    );

    console.log(`Generated ${outages.length} outages`);

    // Replace outages collection
    console.log('Updating outages collection...');
    await db.collection('outages').deleteMany({});
    if (outages.length > 0) {
      await db.collection('outages').insertMany(outages);
    }

    console.log('Sync completed successfully');
    return NextResponse.json({ inserted: rawEvents.length, outages: outages.length });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during sync', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}


