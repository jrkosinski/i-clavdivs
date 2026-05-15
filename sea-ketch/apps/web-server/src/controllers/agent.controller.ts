import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AgentService } from '../services/agent.service';

/**
 * @notice REST controller exposing agent management endpoints.
 */
@ApiTags('agent')
@Controller()
export class AgentController {
    /**
     * @notice Constructs the AgentController with the injected AgentService.
     * @param _agentService Service responsible for agent lifecycle management.
     */
    public constructor(private readonly _agentService: AgentService) {}

    /**
     * @notice Returns the IDs of all currently registered agents.
     * @returns An array of agent ID strings.
     */
    @Get()
    public getAgents(): string[] {
        return this._agentService.getAgents();
    }
}
