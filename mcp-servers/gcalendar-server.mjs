#!/usr/bin/env node
/**
 * Google Calendar MCP Server
 * Requires: npm install @modelcontextprotocol/sdk googleapis zod
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { google } from 'googleapis';
import { z } from 'zod';
import fs from 'fs';

// Get Google Calendar client using OAuth tokens
function getCalendarClient() {
  const credentialsPath = process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH || '/home/chris/.config/gcloud/credentials.json';
  const tokensPath = '/home/chris/.config/gcloud/tokens.json';
  
  // Read OAuth credentials
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const { client_id, client_secret } = credentials.installed || credentials.web;
  
  // Read saved tokens
  const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
  
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
  oauth2Client.setCredentials(tokens);
  
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Create MCP server
const server = new McpServer({
  name: 'google-calendar-server',
  version: '1.0.0',
});

// Tool: List calendars
server.tool(
  'list_calendars',
  'List all calendars accessible to the user',
  {},
  async () => {
    try {
      const calendar = getCalendarClient();
      const response = await calendar.calendarList.list();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response.data.items, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: List events
server.tool(
  'list_events',
  'List events from a calendar',
  {
    calendarId: z.string().optional().describe('Calendar ID (default: primary)'),
    timeMin: z.string().optional().describe('Minimum time in ISO format'),
    timeMax: z.string().optional().describe('Maximum time in ISO format'),
    maxResults: z.number().optional().default(10).describe('Maximum number of events to return'),
  },
  async ({ calendarId, timeMin, timeMax, maxResults }) => {
    try {
      const calendar = getCalendarClient();
      const response = await calendar.events.list({
        calendarId: calendarId || 'primary',
        timeMin: timeMin || new Date().toISOString(),
        timeMax,
        maxResults: maxResults || 10,
        singleEvents: true,
        orderBy: 'startTime',
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response.data.items, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Get event
server.tool(
  'get_event',
  'Get details of a specific event',
  {
    calendarId: z.string().optional().describe('Calendar ID (default: primary)'),
    eventId: z.string().describe('Event ID'),
  },
  async ({ calendarId, eventId }) => {
    try {
      const calendar = getCalendarClient();
      const response = await calendar.events.get({
        calendarId: calendarId || 'primary',
        eventId,
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
