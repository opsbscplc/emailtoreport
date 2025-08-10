/* eslint-disable no-console */
const http = require('http');
const { google } = require('googleapis');

// Usage:
//   export GOOGLE_CLIENT_ID=xxx
//   export GOOGLE_CLIENT_SECRET=xxx
//   node scripts/get-gmail-refresh-token.js
//
// Notes:
// - Ensure this redirect URI is added to your OAuth 2.0 Client (Web) in GCP:
//     http://localhost:53682/oauth2callback

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:53682/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('ERROR: Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables first.');
  process.exit(1);
}

async function main() {
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const scope = 'https://www.googleapis.com/auth/gmail.readonly';
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope,
  });

  console.log('Open this URL in your browser to authorize:');
  console.log(authUrl);
  console.log('\nWaiting for OAuth redirect on', REDIRECT_URI, '...');

  const server = http.createServer(async (req, res) => {
    try {
      if (!req.url || !req.url.startsWith('/oauth2callback')) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const url = new URL(req.url, REDIRECT_URI);
      const code = url.searchParams.get('code');
      if (!code) {
        res.writeHead(400);
        res.end('Missing code parameter');
        return;
      }
      const { tokens } = await oauth2Client.getToken(code);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Auth complete. You can close this tab.\n');
      server.close();

      console.log('\nAccess Token:', tokens.access_token || '(returned by Google)');
      console.log('Refresh Token:', tokens.refresh_token || '(not returned; ensure prompt=consent and access_type=offline)');
      console.log('\nSave the Refresh Token as GMAIL_REFRESH_TOKEN.');
    } catch (err) {
      console.error('Error exchanging code for tokens:', err.message || err);
      try {
        res.writeHead(500);
        res.end('Error during auth flow');
      } catch {}
      server.close();
    }
  });

  server.listen(53682);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


