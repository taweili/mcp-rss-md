import { RssToMdServer } from './rss-to-md-server';

async function main() {
  const server = new RssToMdServer();
  
  try {
    const result = await server.handleToolRequest({
      params: {
        name: 'rss_to_md',
        arguments: {
          url: 'https://rss.slashdot.org/Slashdot/slashdotMain'
        }
      }
    });
    
    console.log(result.content[0].text);
  } catch (error) {
    console.error('Error processing RSS feed:', error);
  }
}

main().catch(console.error);