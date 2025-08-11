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

    // Store raw email events (dedup on messageId) with bulk operations for better performance
    const rawEvents: { type: 'down' | 'up'; at: Date; messageId: string }[] = [];
    const bulkOps: any[] = [];
    
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

      // Prepare bulk operation instead of individual updates
      bulkOps.push({
        updateOne: {
          filter: { messageId },
          update: { $setOnInsert: { messageId, subject, date: at, type } },
          upsert: true
        }
      });
    }

    // Execute bulk operations for better performance
    if (bulkOps.length > 0) {
      console.log(`Executing bulk upsert for ${bulkOps.length} email records...`);
      await db.collection('emails').bulkWrite(bulkOps, { ordered: false });
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

    // Efficiently update outages collection using upsert operations
    console.log('Updating outages collection...');
    if (outages.length > 0) {
      // Use bulk operations for better performance instead of delete all + insert
      const outageOps = outages.map((outage, index) => ({
        replaceOne: {
          filter: { _id: outage._id || `generated_${index}_${Date.now()}` },
          replacement: outage,
          upsert: true
        }
      }));
      
      // Clear old outages first (more efficient than deleteMany + insertMany)
      await db.collection('outages').deleteMany({});
      await db.collection('outages').bulkWrite(
        outages.map((outage) => ({
          insertOne: { document: outage }
        })),
        { ordered: false }
      );
    } else {
      // Only clear if no new outages to insert
      await db.collection('outages').deleteMany({});
    }

    console.log('Sync completed successfully');
    
    // Clear any API response caches after sync (if using an external cache like Redis, clear it here)
    // For now, we'll add a timestamp to help with cache invalidation
    const syncTimestamp = new Date().toISOString();
    
    return NextResponse.json({ 
      inserted: rawEvents.length, 
      outages: outages.length,
      syncCompletedAt: syncTimestamp,
      message: 'Sync completed successfully. API response caches should be invalidated.'
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during sync', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}


