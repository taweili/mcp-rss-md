import { RssToMdServer } from '../../rss-to-md-server';
import { ParsedRss } from '../../rss-to-md-server';

describe('Markdown Conversion', () => {
  let server: RssToMdServer;

  beforeAll(() => {
    server = new RssToMdServer();
  });

  test('should convert basic RSS feed to markdown', () => {
    const mockRss: ParsedRss = {
      rss: {
        channel: [{
          title: ['Test Feed'],
          description: ['Test Description'],
          items: [{
            title: ['Item 1'],
            link: ['https://example.com/item1'],
            description: ['Item 1 Description']
          }]
        }]
      }
    };

    const result = server['convertToMarkdown'](mockRss);
    expect(result).toMatchSnapshot();
  });

  test('should handle missing description', () => {
    const mockRss: ParsedRss = {
      rss: {
        channel: [{
          title: ['Test Feed'],
          items: [{
            title: ['Item 1'],
            link: ['https://example.com/item1']
          }]
        }]
      }
    };

    const result = server['convertToMarkdown'](mockRss);
    expect(result).toMatchSnapshot();
  });
});