import { Injectable } from '@nestjs/common';
import { IAgent } from 'ai';

/**
 * @notice NestJS service responsible for managing the lifecycle of AI agents.
 */
@Injectable()
export class AgentService {
    private _agents: IAgent[] = [];

    /**
     * @notice Returns the IDs of all registered agents.
     * @returns An array of agent ID strings.
     */
    public getAgents(): string[] {
        return this._agents.map((a) => a.id);
    }

    /**
     * @notice Starts a new agent and registers it with the service.
     */
    public async startAgent(): Promise<void> {}
}
