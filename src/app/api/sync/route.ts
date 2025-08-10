import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { getGmailClient, listLabelMessages, extractHeader, parsePdbSubject } from '@/lib/gmail';
import { groupEventsIntoOutages } from '@/lib/outages';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const accessToken = (session as any).accessToken as string | undefined;
  if (!accessToken) {
    return NextResponse.json({ error: 'Missing Gmail access token. Re-login with Google.' }, { status: 400 });
  }

  const gmail = getGmailClient(accessToken);
  const user = process.env.GMAIL_USER || 'me';
  const label = process.env.GMAIL_LABEL_NAME || 'PDB Notifications';
  const db = await getDb();

  // Fetch ALL messages from January 1, 2025 onwards for complete historical data
  const messages = await listLabelMessages(gmail, user, label, 200, '2025/01/01');

  // Store raw email events (dedup on messageId)
  const rawEvents: { type: 'down' | 'up'; at: Date; messageId: string }[] = [];
  for (const m of messages) {
    const subject = extractHeader(m, 'Subject');
    const type = parsePdbSubject(subject);
    if (!type) continue;

    const dateStr = extractHeader(m, 'Date');
    const messageId = extractHeader(m, 'Message-Id') || m.id || '';
    if (!dateStr || !messageId) continue;
    const at = new Date(dateStr);
    rawEvents.push({ type, at, messageId });

    await db.collection('emails').updateOne(
      { messageId },
      { $setOnInsert: { messageId, subject, date: at, type } },
      { upsert: true }
    );
  }

  // Recompute outages from all known events in DB
  const emailDocs = await db
    .collection('emails')
    .find({ type: { $in: ['down', 'up'] } })
    .project<{ messageId: string; date: Date; type: 'down' | 'up' }>({ messageId: 1, date: 1, type: 1 })
    .toArray();

  const outages = groupEventsIntoOutages(
    emailDocs.map((d) => ({ type: d.type, at: new Date(d.date), messageId: d.messageId }))
  );

  // Replace outages collection
  const bulk = db.collection('outages').initializeUnorderedBulkOp();
  for (const o of outages) {
    const key = {
      start: o.start,
      end: o.end ?? null,
    };
    bulk.find(key).upsert().replaceOne({ ...o });
  }
  await db.collection('outages').deleteMany({});
  if (outages.length > 0) {
    await db.collection('outages').insertMany(outages);
  }

  return NextResponse.json({ inserted: rawEvents.length, outages: outages.length });
}


