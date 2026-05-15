import Anthropic from '@anthropic-ai/sdk';
import { IProvider } from './agent';

/**
 * @notice IProvider implementation that delegates to the Anthropic Messages API.
 */
export class AnthropicProvider implements IProvider {
    private readonly _client: Anthropic;

    /**
     * @notice Constructs an AnthropicProvider with the given API key.
     * @param apiKey Anthropic API key used to authenticate requests.
     */
    public constructor(apiKey: string) {
        this._client = new Anthropic({ apiKey });
    }

    /**
     * @notice Sends a messages-create request to the Anthropic API.
     * @param input Request parameters accepted by Anthropic's messages.create.
     * @returns A promise resolving to the Anthropic API response.
     */
    public async complete(input: any): Promise<any> {
        return this._client.messages.create(input);
    }
}
