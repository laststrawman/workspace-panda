#!/usr/bin/env node
/**
 * Simple Google Calendar MCP Server
 * Requires: npm install @google-cloud/calendar google-auth-library
 */

const { Server } = require('@modelcontextprotocol/sdk/dist/cjs/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/dist/cjs/server/stdio.js');
const { google } = require('googleapis');

// Create MCP server
const server = new Server(
  {
    name: 'google-calendar-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Get Google Calendar client
function getCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH || '/home/chris/.config/gcloud/credentials.json',
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });
  return google.calendar({ version: 'v3', auth });
}

// List available tools
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'list_calendars',
        description: 'List all calendars accessible to the user',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_events',
        description: 'List events from a calendar',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID (default: primary)',
            },
            timeMin: {
              type: 'string',
              description: 'Minimum time in ISO format',
            },
            timeMax: {
              type: 'string',
              description: 'Maximum time in ISO format',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of events to return',
              default: 10,
            },
          },
        },
      },
      {
        name: 'get_event',
        description: 'Get details of a specific event',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID (default: primary)',
            },
            eventId: {
              type: 'string',
              description: 'Event ID',
            },
          },
          required: ['eventId'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  const calendar = getCalendarClient();

  try {
    switch (name) {
      case 'list_calendars': {
        const response = await calendar.calendarList.list();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data.items, null, 2),
            },
          ],
        };
      }

      case 'list_events': {
        const response = await calendar.events.list({
          calendarId: args.calendarId || 'primary',
          timeMin: args.timeMin || new Date().toISOString(),
          timeMax: args.timeMax,
          maxResults: args.maxResults || 10,
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
      }

      case 'get_event': {
        const response = await calendar.events.get({
          calendarId: args.calendarId || 'primary',
          eventId: args.eventId,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
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
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
