import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import type { gmail_v1 } from 'googleapis';

export type GmailMessage = gmail_v1.Schema$Message;

export function getGmailClient(accessToken?: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/google`
  );

  if (accessToken) {
    oauth2Client.setCredentials({ access_token: accessToken });
  }

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export async function listLabelMessages(
  gmail: gmail_v1.Gmail,
  userId: string,
  labelName: string,
  maxResults = 100,
  fromDate?: string // Optional date filter in YYYY/MM/DD format
) {
  const labelRes = await gmail.users.labels.list({ userId });
  const label = labelRes.data.labels?.find((l) => l.name === labelName);
  if (!label?.id) return [] as GmailMessage[];

  // Fetch ALL messages with pagination if fromDate is specified, otherwise use the old behavior
  const allMessages: { id: string }[] = [];
  
  if (fromDate) {
    // Enhanced mode: fetch ALL messages from specified date with pagination
    let pageToken: string | undefined = undefined;
    
    do {
      const res = await gmail.users.messages.list({
        userId,
        labelIds: [label.id],
        maxResults: 500, // Use larger page size for efficiency
        pageToken,
        q: `after:${fromDate}` // Gmail search format: YYYY/MM/DD
      });
      
      const messages = res.data.messages || [];
      allMessages.push(...messages);
      pageToken = res.data.nextPageToken;
      
      console.log(`Fetched ${messages.length} messages (total: ${allMessages.length})`);
    } while (pageToken);
    
    console.log(`Found ${allMessages.length} total messages from ${fromDate} onwards`);
  } else {
    // Legacy mode: fetch limited messages without date filter
    const res = await gmail.users.messages.list({
      userId,
      labelIds: [label.id],
      maxResults,
    });
    allMessages.push(...(res.data.messages || []));
  }

  if (allMessages.length === 0) return [];

  // Fetch detailed message data in batches to avoid rate limits
  const batchSize = 100;
  const detailed: GmailMessage[] = [];
  
  for (let i = 0; i < allMessages.length; i += batchSize) {
    const batch = allMessages.slice(i, i + batchSize);
    const batchDetailed = await Promise.all(
      batch.map((m) =>
        gmail.users.messages.get({ 
          userId, 
          id: m.id as string, 
          format: 'metadata', 
          metadataHeaders: ['Subject', 'Date', 'Message-Id'] 
        }).then((r) => r.data)
      )
    );
    detailed.push(...batchDetailed);
    
    if (fromDate && batch.length > 0) {
      console.log(`Processed ${detailed.length}/${allMessages.length} messages`);
    }
  }
  
  return detailed;
}

export function extractHeader(message: GmailMessage, name: string): string | undefined {
  const headers = message.payload?.headers || [];
  return headers.find((h) => (h.name || '').toLowerCase() === name.toLowerCase())?.value || undefined;
}

export function parsePdbSubject(subject?: string): 'down' | 'up' | undefined {
  if (!subject) return undefined;
  const s = subject.toLowerCase();
  if (s.includes('pdb down')) return 'down';
  if (s.includes('pdb up')) return 'up';
  return undefined;
}


