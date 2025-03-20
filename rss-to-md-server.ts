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
  item?: RssItem[];
}

export interface RssItem {
  title: string[];
  link: string[];
  description?: string[];
}

export interface ParsedRss {
  rss: {
    channel: RssChannel[];
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
        const parsed: ParsedRss = await parseStringPromise(response.data);
        
        // Convert to Markdown
        const markdown = this.convertToMarkdown(parsed);
        
        return {
          content: [{
            type: 'text',
            text: markdown
          }]
        };
      } catch (error: unknown) {
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
    const channel = parsed.rss.channel[0];
    let markdown = `# ${channel.title[0]}\n\n`;
    
    if (channel.description) {
      markdown += `${channel.description[0]}\n\n`;
    }

    if (channel.item) {
      markdown += '## Items\n\n';
      channel.item.forEach(item => {
        markdown += `- [${item.title[0]}](${item.link[0]})\n`;
        if (item.description) {
          markdown += `  ${item.description[0]}\n`;
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
    console.error('RSS to Markdown MCP server running on stdio');
  }
}

const server = new RssToMdServer();
server.run().catch((error: Error) => console.error(error));