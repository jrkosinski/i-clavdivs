import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { IMcpClient, IMcpTool } from './agent';

/**
 * @notice IMcpClient implementation that communicates with an MCP server over Streamable HTTP.
 * @dev A fresh Client connection is opened and closed for every request.
 */
export class HttpMcpClient implements IMcpClient {
    /**
     * @notice Constructs an HttpMcpClient targeting the given server URL.
     * @param _url The URL of the MCP server's HTTP endpoint.
     */
    public constructor(private readonly _url: string) {}

    /**
     * @notice Fetches the list of tools from the MCP server.
     * @returns A promise resolving to an array of tool descriptors.
     */
    public async listTools(): Promise<IMcpTool[]> {
        const client = await this._connect();
        try {
            const result = await client.listTools();
            return result.tools.map((t) => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema as Record<string, unknown>,
            }));
        } finally {
            await client.close();
        }
    }

    /**
     * @notice Invokes a named tool on the MCP server.
     * @param name The name of the tool to call.
     * @param args Arguments to pass to the tool.
     * @returns A promise resolving to the tool's response.
     */
    public async callTool(name: string, args?: Record<string, unknown>): Promise<any> {
        const client = await this._connect();
        try {
            return client.callTool({ name, arguments: args });
        } finally {
            await client.close();
        }
    }

    /**
     * @notice Opens a new Streamable HTTP connection to the MCP server.
     * @returns A promise resolving to a connected MCP Client instance.
     */
    private async _connect(): Promise<Client> {
        const client = new Client({ name: 'web-client', version: '0.1.0' });
        const transport = new StreamableHTTPClientTransport(new URL(this._url));
        await client.connect(transport);
        return client;
    }
}
