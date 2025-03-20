import { RssToMdServer } from '../../rss-to-md-server';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

jest.mock('axios');
jest.mock('xml2js');

describe('RSS Feed Validation', () => {
  let server: RssToMdServer;

  beforeAll(() => {
    server = new RssToMdServer();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Error Handling', () => {
    test('should handle invalid XML', async () => {
      const mockRss = 'invalid xml';
      (axios.get as jest.Mock).mockResolvedValue({ data: mockRss });
      (parseStringPromise as jest.Mock).mockRejectedValue(new Error('Invalid XML'));

      await expect(server.handleToolRequest({
        params: {
          name: 'rss_to_md',
          arguments: {
            url: 'https://invalid.example.com/feed'
          }
        }
      })).rejects.toThrow('Invalid XML');
    });

    test('should handle network errors', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      await expect(server.handleToolRequest({
        params: {
          name: 'rss_to_md',
          arguments: {
            url: 'https://network-error.example.com/feed'
          }
        }
      })).rejects.toThrow('Network Error');
    });

    test('should handle malformed RSS feeds', async () => {
      const mockRss = `<?xml version="1.0"?>
      <rss version="2.0">
        <channel>
          <title>Test Feed</title>
          <item>
            <!-- Missing required title and link -->
          </item>
        </channel>
      </rss>`;

      (axios.get as jest.Mock).mockResolvedValue({ data: mockRss });
      (parseStringPromise as jest.Mock).mockResolvedValue({
        rss: {
          channel: [{
            title: ['Test Feed'],
            item: [{}]
          }]
        }
      });

      const result = await server.handleToolRequest({
        params: {
          name: 'rss_to_md',
          arguments: {
            url: 'https://malformed.example.com/feed'
          }
        }
      });

      expect(result).toMatchSnapshot();
    });
  });

  describe('Field Extraction', () => {
    test('should extract all relevant fields', async () => {
      const mockRss = `<?xml version="1.0"?>
      <rss version="2.0">
        <channel>
          <title>Test Feed</title>
          <description>Test Description</description>
          <item>
            <title>Item 1</title>
            <link>https://example.com/item1</link>
            <pubDate>Wed, 21 Mar 2025 00:00:00 +0000</pubDate>
            <author>author@example.com</author>
            <category>Technology</category>
            <category>Programming</category>
          </item>
        </channel>
      </rss>`;

      (axios.get as jest.Mock).mockResolvedValue({ data: mockRss });
      (parseStringPromise as jest.Mock).mockResolvedValue({
        rss: {
          channel: [{
            title: ['Test Feed'],
            description: ['Test Description'],
            item: [{
              title: ['Item 1'],
              link: ['https://example.com/item1'],
              pubDate: ['Wed, 21 Mar 2025 00:00:00 +0000'],
              author: ['author@example.com'],
              category: ['Technology', 'Programming']
            }]
          }]
        }
      });

      const result = await server.handleToolRequest({
        params: {
          name: 'rss_to_md',
          arguments: {
            url: 'https://complete.example.com/feed'
          }
        }
      });

      expect(result).toMatchSnapshot();
    });
  });

  describe('Performance', () => {
    test('should handle large feeds efficiently', async () => {
      const items = Array(1000).fill(0).map((_, i) => `
        <item>
          <title>Item ${i}</title>
          <link>https://example.com/item${i}</link>
        </item>
      `).join('');

      const mockRss = `<?xml version="1.0"?>
      <rss version="2.0">
        <channel>
          <title>Large Feed</title>
          ${items}
        </channel>
      </rss>`;

      (axios.get as jest.Mock).mockResolvedValue({ data: mockRss });
      (parseStringPromise as jest.Mock).mockImplementation((xml) => {
        return Promise.resolve({
          rss: {
            channel: [{
              title: ['Large Feed'],
              item: Array(1000).fill(0).map((_, i) => ({
                title: [`Item ${i}`],
                link: [`https://example.com/item${i}`]
              }))
            }]
          }
        });
      });

      const start = Date.now();
      await server.handleToolRequest({
        params: {
          name: 'rss_to_md',
          arguments: {
            url: 'https://large.example.com/feed'
          }
        }
      });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Should process in under 1 second
    });
  });
});