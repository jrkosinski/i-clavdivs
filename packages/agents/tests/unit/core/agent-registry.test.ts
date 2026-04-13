/**
 * Tests for AgentRegistry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    AgentRegistry,
    getGlobalRegistry,
    resetGlobalRegistry,
    type IAgentRegistration,
} from '../../../src/core/agent-registry.js';

describe('AgentRegistry', () => {
    let registry: AgentRegistry;

    beforeEach(() => {
        registry = new AgentRegistry();
    });

    describe('register', () => {
        it('should register a new agent', () => {
            const agent: IAgentRegistration = {
                id: 'conan',
                name: 'Conan',
                description: 'A public-facing Discord bot agent',
            };

            registry.register(agent);

            expect(registry.has('conan')).toBe(true);
            expect(registry.get('conan')).toEqual(agent);
        });

        it('should throw error when registering duplicate agent ID', () => {
            const agent: IAgentRegistration = {
                id: 'conan',
                name: 'Conan',
                description: 'A public-facing Discord bot agent',
            };

            registry.register(agent);

            expect(() => registry.register(agent)).toThrow('Agent already registered: conan');
        });

        it('should allow multiple agents with different IDs', () => {
            const conan: IAgentRegistration = {
                id: 'conan',
                name: 'Conan',
                description: 'A public-facing Discord bot agent',
            };

            const alan: IAgentRegistration = {
                id: 'alan-watts',
                name: 'Alan Watts',
                description: 'Philosophy and Buddhism expert',
            };

            registry.register(conan);
            registry.register(alan);

            expect(registry.has('conan')).toBe(true);
            expect(registry.has('alan-watts')).toBe(true);
        });
    });

    describe('get', () => {
        it('should return agent registration when found', () => {
            const agent: IAgentRegistration = {
                id: 'conan',
                name: 'Conan',
                description: 'A public-facing Discord bot agent',
            };

            registry.register(agent);

            expect(registry.get('conan')).toEqual(agent);
        });

        it('should return undefined when agent not found', () => {
            expect(registry.get('nonexistent')).toBeUndefined();
        });
    });

    describe('has', () => {
        it('should return true for registered agent', () => {
            const agent: IAgentRegistration = {
                id: 'conan',
                name: 'Conan',
                description: 'A public-facing Discord bot agent',
            };

            registry.register(agent);

            expect(registry.has('conan')).toBe(true);
        });

        it('should return false for unregistered agent', () => {
            expect(registry.has('nonexistent')).toBe(false);
        });
    });

    describe('listAll', () => {
        it('should return empty array when no agents registered', () => {
            expect(registry.listAll()).toEqual([]);
        });

        it('should return all registered agents', () => {
            const conan: IAgentRegistration = {
                id: 'conan',
                name: 'Conan',
                description: 'A public-facing Discord bot agent',
            };

            const alan: IAgentRegistration = {
                id: 'alan-watts',
                name: 'Alan Watts',
                description: 'Philosophy and Buddhism expert',
            };

            registry.register(conan);
            registry.register(alan);

            const agents = registry.listAll();
            expect(agents).toHaveLength(2);
            expect(agents).toContainEqual(conan);
            expect(agents).toContainEqual(alan);
        });
    });

    describe('unregister', () => {
        it('should remove registered agent', () => {
            const agent: IAgentRegistration = {
                id: 'conan',
                name: 'Conan',
                description: 'A public-facing Discord bot agent',
            };

            registry.register(agent);
            expect(registry.has('conan')).toBe(true);

            const removed = registry.unregister('conan');
            expect(removed).toBe(true);
            expect(registry.has('conan')).toBe(false);
        });

        it('should return false when removing non-existent agent', () => {
            const removed = registry.unregister('nonexistent');
            expect(removed).toBe(false);
        });
    });

    describe('clear', () => {
        it('should remove all agents', () => {
            const conan: IAgentRegistration = {
                id: 'conan',
                name: 'Conan',
                description: 'A public-facing Discord bot agent',
            };

            const alan: IAgentRegistration = {
                id: 'alan-watts',
                name: 'Alan Watts',
                description: 'Philosophy and Buddhism expert',
            };

            registry.register(conan);
            registry.register(alan);

            expect(registry.listAll()).toHaveLength(2);

            registry.clear();

            expect(registry.listAll()).toHaveLength(0);
            expect(registry.has('conan')).toBe(false);
            expect(registry.has('alan-watts')).toBe(false);
        });
    });
});

describe('Global Registry', () => {
    beforeEach(() => {
        resetGlobalRegistry();
    });

    it('should return same instance on multiple calls', () => {
        const registry1 = getGlobalRegistry();
        const registry2 = getGlobalRegistry();

        expect(registry1).toBe(registry2);
    });

    it('should persist registrations across calls', () => {
        const agent: IAgentRegistration = {
            id: 'conan',
            name: 'Conan',
            description: 'A public-facing Discord bot agent',
        };

        const registry1 = getGlobalRegistry();
        registry1.register(agent);

        const registry2 = getGlobalRegistry();
        expect(registry2.has('conan')).toBe(true);
    });

    it('should reset registry on resetGlobalRegistry call', () => {
        const agent: IAgentRegistration = {
            id: 'conan',
            name: 'Conan',
            description: 'A public-facing Discord bot agent',
        };

        const registry1 = getGlobalRegistry();
        registry1.register(agent);

        resetGlobalRegistry();

        const registry2 = getGlobalRegistry();
        expect(registry2.has('conan')).toBe(false);
    });
});
