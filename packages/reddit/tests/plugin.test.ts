import { describe, it, expect } from 'vitest';
import { redditPlugin } from '../src/plugin.js';

describe('Reddit Plugin', () => {
    it('should have correct metadata', () => {
        expect(redditPlugin.id).toBe('reddit');
        expect(redditPlugin.name).toBe('Reddit');
        expect(redditPlugin.version).toBe('0.1.0');
        expect(redditPlugin.description).toContain('Reddit');
    });

    it('should have channel metadata', () => {
        expect(redditPlugin.channelMetadata.id).toBe('reddit');
        expect(redditPlugin.channelMetadata.label).toBe('Reddit');
        expect(redditPlugin.channelMetadata.icon).toBe('🤖');
        expect(redditPlugin.channelMetadata.aliases).toContain('r');
    });

    it('should have capabilities defined', () => {
        expect(redditPlugin.capabilities.chatTypes).toContain('direct');
        expect(redditPlugin.capabilities.chatTypes).toContain('channel');
        expect(redditPlugin.capabilities.threads).toBe(true);
        expect(redditPlugin.capabilities.media).toBe(false);
        expect(redditPlugin.capabilities.reactions).toBe(false);
    });

    it('should have register method', () => {
        expect(typeof redditPlugin.register).toBe('function');
    });

    it('should have createGateway method', () => {
        expect(typeof redditPlugin.createGateway).toBe('function');
    });

    it('should have unregister method', () => {
        expect(typeof redditPlugin.unregister).toBe('function');
    });

    it('should create a gateway instance', () => {
        const gateway = redditPlugin.createGateway({});
        expect(gateway).toBeDefined();
        expect(typeof gateway.start).toBe('function');
        expect(typeof gateway.stop).toBe('function');
        expect(typeof gateway.isRunning).toBe('function');
        expect(typeof gateway.sendMessage).toBe('function');
    });
});
