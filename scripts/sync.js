/* eslint-disable no-console */
const { MongoClient } = require('mongodb');
const { google } = require('googleapis');
const { differenceInMinutes } = require('date-fns');

async function main() {
  const {
    MONGODB_URI,
    MONGODB_DB = 'emailtoreport',
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GMAIL_REFRESH_TOKEN,
    GMAIL_USER = 'me',
    GMAIL_LABEL_NAME = 'PDB Notifications',
  } = process.env;

  if (!MONGODB_URI) throw new Error('Missing MONGODB_URI');
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) throw new Error('Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET');
  if (!GMAIL_REFRESH_TOKEN) throw new Error('Missing GMAIL_REFRESH_TOKEN');

  // Mongo
  const mongo = new MongoClient(MONGODB_URI);
  await mongo.connect();
  const db = mongo.db(MONGODB_DB);
  await Promise.all([
    db.collection('emails').createIndex({ messageId: 1 }, { unique: true }),
    db.collection('outages').createIndex({ start: 1 }),
    db.collection('outages').createIndex({ year: 1, month: 1, day: 1 }),
  ]).catch(() => undefined);

  // Gmail via OAuth2 refresh token
  const oauth2 = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
  const gmail = google.gmail({ version: 'v1', auth: oauth2 });

  // Resolve label id
  const labelsRes = await gmail.users.labels.list({ userId: GMAIL_USER });
  const label = (labelsRes.data.labels || []).find((l) => l.name === GMAIL_LABEL_NAME);
  if (!label) {
    throw new Error(`Label not found: ${GMAIL_LABEL_NAME}`);
  }

  // List ALL messages from January 1, 2025 onwards with pagination
  const allMessages = [];
  let pageToken = undefined;
  const startDate = '2025/01/01'; // Gmail search format: YYYY/MM/DD
  
  do {
    const listRes = await gmail.users.messages.list({ 
      userId: GMAIL_USER, 
      labelIds: [label.id], 
      maxResults: 500,
      pageToken,
      q: `after:${startDate}` // Only get messages from January 1, 2025 onwards
    });
    
    const messages = listRes.data.messages || [];
    allMessages.push(...messages);
    pageToken = listRes.data.nextPageToken;
    
    console.log(`Fetched ${messages.length} messages (total: ${allMessages.length})`);
  } while (pageToken);
  
  console.log(`Found ${allMessages.length} total messages in label from ${startDate} onwards`);

  let insertedOrSeen = 0;
  for (const m of allMessages) {
    const msg = await gmail.users.messages.get({ userId: GMAIL_USER, id: m.id, format: 'metadata', metadataHeaders: ['Subject', 'Date', 'Message-Id'] });
    const headers = msg.data.payload?.headers || [];
    const header = (name) => headers.find((h) => (h.name || '').toLowerCase() === name.toLowerCase())?.value;
    const subjectRaw = header('Subject') || '';
    const subject = subjectRaw.toLowerCase();
    const isDown = subject.includes('pdb down');
    const isUp = subject.includes('pdb up');
    if (!isDown && !isUp) continue;
    const dateStr = header('Date');
    const messageId = header('Message-Id') || msg.data.id;
    if (!dateStr || !messageId) continue;
    const at = new Date(dateStr);
    const type = isDown ? 'down' : 'up';
    try {
      await db.collection('emails').updateOne(
        { messageId },
        { $setOnInsert: { messageId, subject: subjectRaw, date: at, type } },
        { upsert: true }
      );
      insertedOrSeen += 1;
    } catch (e) {
      if (e?.code === 11000) {
        // duplicate
        continue;
      }
      throw e;
    }
  }

  // Rebuild outages from all events
  const events = await db
    .collection('emails')
    .find({ type: { $in: ['down', 'up'] } })
    .project({ messageId: 1, date: 1, type: 1 })
    .toArray();

  const rawEvents = events
    .map((d) => ({ type: d.type, at: new Date(d.date), messageId: d.messageId }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  const outages = [];
  let current = null;
  for (const e of rawEvents) {
    if (e.type === 'down') {
      if (!current) {
        current = {
          start: e.at,
          events: [e],
          year: e.at.getFullYear(),
          month: e.at.getMonth() + 1,
          day: e.at.getDate(),
        };
      } else {
        current.events.push(e);
      }
    } else if (e.type === 'up') {
      if (current) {
        current.events.push(e);
        current.end = e.at;
        current.durationMinutes = Math.max(0, differenceInMinutes(e.at, current.start));
        outages.push(current);
        current = null;
      }
    }
  }
  if (current) outages.push(current);

  await db.collection('outages').deleteMany({});
  if (outages.length) await db.collection('outages').insertMany(outages);

  console.log(`Processed ${insertedOrSeen} messages. Outages now: ${outages.length}`);

  await mongo.close();
}

main()
  .then(() => {
    // Ensure the process exits to avoid hanging runners
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });


