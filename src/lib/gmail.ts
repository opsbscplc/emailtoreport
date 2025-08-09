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
  maxResults = 100
) {
  const labelRes = await gmail.users.labels.list({ userId });
  const label = labelRes.data.labels?.find((l) => l.name === labelName);
  if (!label?.id) return [] as GmailMessage[];

  const res = await gmail.users.messages.list({
    userId,
    labelIds: [label.id],
    maxResults,
  });
  const messages = res.data.messages || [];
  if (messages.length === 0) return [];

  const detailed = await Promise.all(
    messages.map((m) =>
      gmail.users.messages.get({ userId, id: m.id as string, format: 'metadata', metadataHeaders: ['Subject', 'Date', 'Message-Id'] }).then((r) => r.data)
    )
  );
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


