import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { z } from 'zod';

/**
 * @notice Builds and configures the MCP server with all registered tools.
 */
class SKMcpServer {
    private readonly _server: McpServer;

    public constructor() {
        this._server = new McpServer({ name: 'sk-mcp-server', version: '0.1.0' });
        this._registerTools();
    }

    /** @notice Returns the underlying McpServer instance. */
    public get server(): McpServer {
        return this._server;
    }

    private _registerTools(): void {
        this._registerGetCurrentTimeTool();
        this._registerGetAuthorNameTool();
    }

    private _registerGetCurrentTimeTool(): void {
        this._server.registerTool(
            'get_current_time',
            {
                description: 'Returns the current date and time in the specified timezone',
                inputSchema: {
                    timezone: z
                        .string()
                        .optional()
                        .describe('IANA timezone name, e.g. "America/New_York". Defaults to UTC.'),
                },
            },
            async ({ timezone }) => {
                const tz = timezone ?? 'UTC';
                const now = new Date().toLocaleString('en-US', {
                    timeZone: tz,
                    timeZoneName: 'short',
                });
                return { content: [{ type: 'text', text: `Current time in ${tz}: ${now}` }] };
            }
        );
    }

    private _registerGetAuthorNameTool(): void {
        this._server.registerTool(
            'get_author_name',
            { description: 'Returns the name of the author of this repository' },
            async () => ({ content: [{ type: 'text', text: 'Zooperton the Mellow' }] })
        );
    }
}

/**
 * @notice Hosts a SKMcpServer over HTTP, routing POST /mcp requests to a fresh transport per call.
 */
class McpHttpHost {
    private readonly _port: number;

    /**
     * @notice Constructs a McpHttpHost on the given port.
     * @param port The TCP port to listen on.
     */
    public constructor(port: number) {
        this._port = port;
    }

    /**
     * @notice Starts the HTTP server and begins accepting MCP requests.
     */
    public start(): void {
        const httpServer = createServer((req, res) => {
            void this._handleRequest(req, res);
        });
        httpServer.listen(this._port, () => {
            console.error(`MCP server listening on http://localhost:${this._port}/mcp`);
        });
    }

    private async _handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
        if (req.url !== '/mcp' || req.method !== 'POST') {
            res.writeHead(404).end('Not found');
            return;
        }
        try {
            const body = await this._readBody(req);
            const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
            const mcpServer = new SKMcpServer();
            await mcpServer.server.connect(transport);
            await transport.handleRequest(req, res, body);
            res.on('close', () => transport.close());
        } catch (err) {
            console.error('Error handling request:', err);
            if (!res.headersSent) {
                res.writeHead(500).end(
                    JSON.stringify({
                        jsonrpc: '2.0',
                        error: { code: -32603, message: 'Internal server error' },
                        id: null,
                    })
                );
            }
        }
    }

    private _readBody(req: IncomingMessage): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            req.on('data', (chunk) => chunks.push(chunk));
            req.on('end', () => {
                try {
                    const raw = Buffer.concat(chunks).toString();
                    resolve(raw ? JSON.parse(raw) : undefined);
                } catch (e) {
                    reject(e);
                }
            });
            req.on('error', reject);
        });
    }
}

new McpHttpHost(3000).start();
