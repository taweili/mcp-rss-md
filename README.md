# RSS to Markdown MCP Server

An MCP (Model Context Protocol) server that provides tools for converting RSS feeds into Markdown format.

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Add the server to your MCP configuration:

```json
{
  "mcpServers": {
    "rss-to-md": {
      "command": "node",
      "args": ["rss-to-md-server.js"]
    }
  }
}
```

## MCP Tools

This server provides the following MCP tools:

- `convert_rss`: Converts an RSS feed to Markdown format
  - Parameters:
    - `url`: The URL of the RSS feed to convert
    - `outputPath`: (Optional) Path to save the Markdown output

## Usage

### As an MCP Server

Once configured, you can use the MCP tools through any MCP client.

### Standalone

You can also run the server directly:

```bash
node rss-to-md-server.js
```

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.
