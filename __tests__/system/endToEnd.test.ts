import { RssToMdServer } from '../../rss-to-md-server';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

jest.mock('axios');
jest.mock('xml2js');

describe('End-to-End Functionality', () => {
  let server: RssToMdServer;

  beforeAll(() => {
    server = new RssToMdServer();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('should process RSS feed and convert to markdown', async () => {
    const mockRss = `<?xml version="1.0"?><rss version="2.0"><channel><title>Test Feed</title><description>Test Description</description><item><title>Item 1</title><link>https://example.com/item1</link><description>Item 1 Description</description></item></channel></rss>`;

    (axios.get as jest.Mock).mockResolvedValue({ data: mockRss });
    (parseStringPromise as jest.Mock).mockResolvedValue({
      rss: {
        channel: [{
          title: ['Test Feed'],
          description: ['Test Description'],
          item: [{
            title: ['Item 1'],
            link: ['https://example.com/item1'],
            description: ['Item 1 Description']
          }]
        }]
      }
    });

    const result = await server.handleToolRequest({
      params: {
        name: 'rss_to_md',
        arguments: {
          url: 'https://valid.example.com/feed'
        }
      }
    });

    expect(result).toMatchSnapshot();
    expect(axios.get).toHaveBeenCalledWith('https://valid.example.com/feed');
    expect(parseStringPromise).toHaveBeenCalledWith(mockRss, expect.objectContaining({
      explicitArray: true,
      explicitRoot: true
    }));
  });
});