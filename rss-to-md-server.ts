#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosResponse } from 'axios';
import { parseStringPromise } from 'xml2js';

export interface RssChannel {
  title: string[];
  description?: string[];
  link?: string[];
  items?: RssItem[];
}

export interface RssItem {
  title: Array<string | { _: string }>;
  link: Array<string | { href: string }>;
  description?: Array<string | { _: string }>;
}

export interface ParsedRss {
  rss?: {
    channel: RssChannel[];
  };
  'rdf:RDF'?: {
    channel: {
      'rdf:about'?: string;
      title?: string[];
      description?: string[];
      link?: string[];
      'dc:language'?: string[];
      'dc:rights'?: string[];
      'dc:date'?: string[];
      'dc:publisher'?: string[];
      'dc:creator'?: string[];
      'dc:subject'?: string[];
      'syn:updateBase'?: string[];
      'syn:updateFrequency'?: string[];
      'syn:updatePeriod'?: string[];
    }[];
    item?: RssItem[];
  };
}

export class RssToMdServer {
  private server: Server;
  private toolHandler?: (request: any) => Promise<any>;

  constructor() {
    this.server = new Server(
      {
        name: 'rss-to-md-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandlers();
  }

  public async handleToolRequest(request: any): Promise<any> {
    if (!this.toolHandler) {
      throw new Error('Tool handler not initialized');
    }
    return this.toolHandler(request);
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [{
        name: 'rss_to_md',
        description: 'Convert RSS feed to Markdown format',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'RSS feed URL',
              format: 'uri'
            }
          },
          required: ['url']
        }
      }]
    }));

    // Handle rss_to_md tool
    const handler = async (request: any) => {
      if (request.params.name !== 'rss_to_md') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      const { url } = request.params.arguments;
      if (!url || typeof url !== 'string') {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Invalid URL parameter'
        );
      }

      try {
        // Fetch and parse RSS feed
        const response: AxiosResponse<string> = await axios.get(url);
        const parsed: ParsedRss = await parseStringPromise(response.data, {
          explicitArray: true,   // Force arrays for consistent parsing
          mergeAttrs: false,     // Keep attributes separate
          explicitCharkey: true,
          explicitRoot: true,    // Preserve root element
          ignoreAttrs: false,
          xmlns: true,
          tagNameProcessors: [(name) => {
            // Handle default RSS 1.0 namespace
            if (name === 'RDF' || name === 'Channel' || name === 'item') {
              return name.toLowerCase() === 'rdf' ? 'rdf:RDF' : name;
            }
            // Preserve RDF namespace prefix
            if (name.startsWith('rdf:')) return name;
            // Strip other namespace prefixes
            return name.replace(/^.*:/, '');
          }]
        });
        
        // Validate basic RSS structure
        if (!parsed.rss && !parsed['rdf:RDF']) {
          throw new Error(`Invalid RSS feed - received content: ${response.data.substring(0, 200)}`);
        }
        
        // Convert to Markdown
        const markdown = this.convertToMarkdown(parsed);
        
        return {
          content: [{
            type: 'text',
            text: markdown
          }]
        };
      } catch (error: unknown) {
        console.error(`RSS processing failed for ${url}:`, error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to process RSS feed: ${message}`
        );
      }
    };

    this.toolHandler = handler;
    this.server.setRequestHandler(CallToolRequestSchema, handler);
  }

  private convertToMarkdown(parsed: ParsedRss): string {
    let channel: RssChannel | undefined;
    
    // Handle RSS 2.0 format
    if (parsed.rss?.channel?.[0]) {
      channel = parsed.rss.channel[0];
    }
    // Handle RSS 1.0/RDF format
    else if (parsed['rdf:RDF']?.channel?.[0]) {
      const rdfChannel = parsed['rdf:RDF'].channel[0];
      channel = {
        title: rdfChannel.title || ['Untitled'],
        description: rdfChannel.description,
        link: rdfChannel.link,
        items: parsed['rdf:RDF'].item
      };
    }

    if (!channel) {
      throw new Error('Invalid RSS feed: missing channel');
    }

    // Validate channel title
    if (!channel.title || !channel.title[0]) {
      throw new Error('Invalid RSS feed: missing channel title');
    }
    
    let markdown = `# ${channel.title[0]}\n\n`;
    
    // Add description if present
    if (channel.description && channel.description[0]) {
      markdown += `${channel.description[0]}\n\n`;
    }

    // Process items if present
    if (channel.items) {
      markdown += '## Items\n\n';
      channel.items.forEach(item => {
        // Validate required item fields
        if (!item.title || !item.title[0]) {
          throw new Error('Invalid RSS feed: missing item title');
        }
        if (!item.link || !item.link[0]) {
          throw new Error('Invalid RSS feed: missing item link');
        }

        const title = typeof item.title[0] === 'object' ? item.title[0]._ : item.title[0];
        const link = typeof item.link[0] === 'object' ? item.link[0].href : item.link[0];
        markdown += `- [${title}](${link})\n`;
        if (item.description) {
          const desc = typeof item.description[0] === 'object' ? item.description[0]._ : item.description[0];
          markdown += `  ${desc}\n`;
        }
      });
    }

    return markdown;
  }

  private setupErrorHandlers(): void {
    this.server.onerror = (error: Error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  public async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // console.log('RSS to Markdown MCP server running on stdio'); // Removed for test cleanliness
  }
}

const server = new RssToMdServer();
server.run().catch((error: Error) => console.error(error));