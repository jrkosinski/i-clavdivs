/**
 * Agent registry for managing and discovering available agents.
 *
 * Provides centralized registration and lookup for agents with their
 * associated metadata. This is a "dumb" registry - it only stores and
 * retrieves agent information. Routing logic lives in agent configurations.
 */

/**
 * Agent registration information.
 */
export interface IAgentRegistration {
    /**
     * Unique agent identifier (e.g., "conan", "alan-watts").
     */
    id: string;

    /**
     * Human-readable agent name.
     */
    name: string;

    /**
     * Description of the agent's purpose and capabilities.
     */
    description: string;
}

/**
 * Agent registry for managing registered agents.
 */
export class AgentRegistry {
    private _agents: Map<string, IAgentRegistration>;

    public constructor() {
        this._agents = new Map();
    }

    /**
     * Registers a new agent.
     *
     * @param registration - The agent registration data
     * @throws Error if agent with same ID is already registered
     */
    public register(registration: IAgentRegistration): void {
        if (this._agents.has(registration.id)) {
            throw new Error(`Agent already registered: ${registration.id}`);
        }
        this._agents.set(registration.id, registration);
    }

    /**
     * Retrieves an agent registration by ID.
     *
     * @param id - The agent identifier
     * @returns The agent registration or undefined if not found
     */
    public get(id: string): IAgentRegistration | undefined {
        return this._agents.get(id);
    }

    /**
     * Checks if an agent is registered.
     *
     * @param id - The agent identifier
     * @returns True if the agent is registered
     */
    public has(id: string): boolean {
        return this._agents.has(id);
    }

    /**
     * Lists all registered agents.
     *
     * @returns Array of all agent registrations
     */
    public listAll(): IAgentRegistration[] {
        return Array.from(this._agents.values());
    }

    /**
     * Unregisters an agent.
     *
     * @param id - The agent identifier to remove
     * @returns True if the agent was removed, false if not found
     */
    public unregister(id: string): boolean {
        return this._agents.delete(id);
    }

    /**
     * Clears all registered agents.
     */
    public clear(): void {
        this._agents.clear();
    }
}

/**
 * Global registry instance.
 */
let _globalRegistry: AgentRegistry | null = null;

/**
 * Gets the global agent registry instance.
 *
 * @returns The global registry
 */
export function getGlobalRegistry(): AgentRegistry {
    if (!_globalRegistry) {
        _globalRegistry = new AgentRegistry();
    }
    return _globalRegistry;
}

/**
 * Resets the global registry (primarily for testing).
 */
export function resetGlobalRegistry(): void {
    _globalRegistry = new AgentRegistry();
}
