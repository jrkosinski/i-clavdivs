/**
 * @notice Abstracts an AI provider capable of processing input and returning a response.
 * @dev Implement this interface to integrate any AI backend (Anthropic, OpenAI, etc.).
 */
export interface IProvider {
    /**
     * @notice Sends input to the AI provider and returns its response.
     * @param input The data to send to the provider.
     * @returns A promise resolving to the provider's response.
     */
    complete(input: any): Promise<any>;
}

/**
 * @notice Describes a single tool exposed by an MCP server.
 */
export interface IMcpTool {
    /** @notice The unique name of the tool. */
    name: string;

    /** @notice Human-readable description of what the tool does. */
    description?: string;

    /** @notice JSON Schema describing the tool's input parameters. */
    inputSchema: Record<string, unknown>;
}

/**
 * @notice Abstracts a connection to an MCP server, exposing discovery and invocation.
 * @dev Implement this interface to wrap any MCP transport (Streamable HTTP, stdio, etc.).
 */
export interface IMcpClient {
    /**
     * @notice Retrieves the list of tools available on this MCP server.
     * @returns A promise resolving to an array of tool descriptors.
     */
    listTools(): Promise<IMcpTool[]>;

    /**
     * @notice Invokes a named tool on this MCP server.
     * @param name The name of the tool to call.
     * @param args The arguments to pass to the tool.
     * @returns A promise resolving to the tool's response.
     */
    callTool(name: string, args?: Record<string, unknown>): Promise<any>;
}

/**
 * @notice Defines the public contract for an AI agent.
 */
export interface IAgent {
    /** @notice The unique identifier for this agent. */
    get id(): string;

    /** @notice The agent's current runtime context. */
    get context(): any;

    /**
     * @notice Processes the given input and returns a response.
     * @param data The input to process.
     * @returns A promise resolving to the agent's response.
     */
    input(data: any): Promise<any>;

    /**
     * @notice Queries all registered MCP clients and returns their combined tool lists.
     * @returns A promise resolving to a flat array of all discovered tools.
     */
    discoverTools(): Promise<IMcpTool[]>;

    /**
     * @notice Invokes a named tool on whichever registered MCP client advertises it.
     * @param name The name of the tool to call.
     * @param args The arguments to pass to the tool.
     * @returns A promise resolving to the tool's response.
     */
    callTool(name: string, args?: Record<string, unknown>): Promise<any>;
}

/**
 * @notice Provider-agnostic agent with MCP tool discovery and invocation capabilities.
 * @dev Inject any `IProvider` for AI processing and any number of `IMcpClient` instances
 *      for MCP server connectivity. No transport details leak into this class.
 */
export class Agent implements IAgent {
    private readonly _id: string;
    private readonly _provider: IProvider;
    private readonly _context: any;
    private readonly _mcpClients: IMcpClient[];

    /**
     * @notice Creates a new Agent.
     * @param id Unique identifier for this agent.
     * @param provider The AI provider used to process input.
     * @param context Initial runtime context. Defaults to an empty object.
     * @param mcpClients MCP server clients available to this agent. Defaults to an empty array.
     */
    public constructor(
        id: string,
        provider: IProvider,
        context: any = {},
        mcpClients: IMcpClient[] = [],
    ) {
        this._id = id;
        this._provider = provider;
        this._context = context;
        this._mcpClients = mcpClients;
    }

    /** @notice The unique identifier for this agent. */
    public get id(): string {
        return this._id;
    }

    /** @notice The agent's current runtime context. */
    public get context(): any {
        return this._context;
    }

    /**
     * @notice Forwards input to the injected provider and returns its response.
     * @param data The input to process.
     * @returns A promise resolving to the provider's response.
     */
    public async input(data: any): Promise<any> {
        return this._provider.complete(data);
    }

    /**
     * @notice Queries all registered MCP clients in parallel and merges their tool lists.
     * @returns A promise resolving to a flat array of all tools across every registered client.
     */
    public async discoverTools(): Promise<IMcpTool[]> {
        const perClient = await Promise.all(
            this._mcpClients.map(client => client.listTools()),
        );
        return perClient.flat();
    }

    /**
     * @notice Finds the first registered MCP client that advertises the named tool and calls it.
     * @param name The name of the tool to invoke.
     * @param args Arguments to pass to the tool.
     * @returns A promise resolving to the tool's response.
     * @dev Throws if no registered client owns a tool with the given name.
     */
    public async callTool(name: string, args?: Record<string, unknown>): Promise<any> {
        for (const client of this._mcpClients) {
            const tools = await client.listTools();
            if (tools.some(tool => tool.name === name)) {
                return client.callTool(name, args);
            }
        }
        throw new Error(`No registered MCP client exposes a tool named "${name}"`);
    }
}
