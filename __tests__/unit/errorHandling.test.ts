import { RssToMdServer } from '../../rss-to-md-server';
import { McpError } from '@modelcontextprotocol/sdk/types.js';

describe('Error Handling', () => {
  let server: RssToMdServer;

  beforeAll(() => {
    server = new RssToMdServer();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('should throw error for invalid URL', async () => {
    const invalidRequest = {
      params: {
        name: 'rss_to_md',
        arguments: {
          url: 'invalid-url'
        }
      }
    };

    await expect(server.handleToolRequest(invalidRequest))
      .rejects
      .toThrow(McpError);
  });

  test('should handle network errors', async () => {
    const request = {
      params: {
        name: 'rss_to_md',
        arguments: {
          url: 'https://nonexistent.example.com/feed'
        }
      }
    };

    await expect(server.handleToolRequest(request))
      .rejects
      .toThrow(McpError);
  }, 10000); // Increased timeout to 10 seconds
});