#!/usr/bin/env node
/**
 * OAuth flow helper for Google Calendar
 * This will open a browser to authorize access
 */

import { google } from 'googleapis';
import { createServer } from 'http';
import { URL } from 'url';
import fs from 'fs';

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

// Read credentials
const credentialsPath = process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH || '/home/chris/.config/gcloud/credentials.json';
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
const { client_id, client_secret } = credentials.installed || credentials.web;

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  REDIRECT_URI
);

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/calendar.readonly'],
  prompt: 'consent'
});

console.log('Please visit this URL to authorize:');
console.log(authUrl);
console.log('');
console.log(`Waiting for authorization on port ${PORT}...`);

// Create server to handle callback
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  if (url.pathname === '/oauth2callback') {
    const code = url.searchParams.get('code');
    
    if (code) {
      try {
        const { tokens } = await oauth2Client.getToken(code);
        
        // Save tokens to a file
        const tokenPath = '/home/chris/.config/gcloud/tokens.json';
        fs.mkdirSync('/home/chris/.config/gcloud', { recursive: true });
        fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorization successful!</h1><p>You can close this window and return to the terminal.</p>');
        
        console.log('\nAuthorization successful!');
        console.log(`Tokens saved to: ${tokenPath}`);
        console.log('You can now use the MCP server.');
        
        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 2000);
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>Error</h1><p>${error.message}</p>`);
        console.error('Error getting tokens:', error);
      }
    } else {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>Error</h1><p>No authorization code received.</p>');
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`OAuth callback server listening on port ${PORT}`);
});
