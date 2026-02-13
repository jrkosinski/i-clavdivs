/**
 * Tests for TmuxSkill wrapper class.
 */

import { describe, it, expect, vi } from 'vitest';
import { TmuxSkill } from './tmux-skill.js';
import { execSync } from 'node:child_process';

//mock execSync
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

describe('TmuxSkill', () => {
  describe('constructor', () => {
    it('should create instance with default skills directory', () => {
      const tmux = new TmuxSkill();
      expect(tmux).toBeInstanceOf(TmuxSkill);
    });

    it('should create instance with custom skills directory', () => {
      const tmux = new TmuxSkill('/custom/path');
      expect(tmux).toBeInstanceOf(TmuxSkill);
    });
  });

  describe('findSessions', () => {
    it('should return empty array when script fails', () => {
      const tmux = new TmuxSkill();
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('tmux not found');
      });

      const sessions = tmux.findSessions();
      expect(sessions).toEqual([]);
    });

    it('should parse sessions from script output', () => {
      const tmux = new TmuxSkill();
      const mockOutput = `Sessions on default socket:
  - session1 (attached, started Mon Feb 13 10:00:00 2024)
  - session2 (detached, started Mon Feb 13 11:30:00 2024)`;

      vi.mocked(execSync).mockReturnValue(mockOutput);

      const sessions = tmux.findSessions();

      expect(sessions).toHaveLength(2);
      expect(sessions[0]?.name).toBe('session1');
      expect(sessions[0]?.attached).toBe(true);
      expect(sessions[1]?.name).toBe('session2');
      expect(sessions[1]?.attached).toBe(false);
    });

    it('should handle socket name option', () => {
      const tmux = new TmuxSkill();
      vi.mocked(execSync).mockReturnValue('');

      tmux.findSessions({ socketName: 'custom' });

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('-L custom'),
        expect.any(Object)
      );
    });

    it('should handle socket path option', () => {
      const tmux = new TmuxSkill();
      vi.mocked(execSync).mockReturnValue('');

      tmux.findSessions({ socketPath: '/tmp/tmux.sock' });

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('-S /tmp/tmux.sock'),
        expect.any(Object)
      );
    });

    it('should handle scan all option', () => {
      const tmux = new TmuxSkill();
      vi.mocked(execSync).mockReturnValue('');

      tmux.findSessions({ scanAll: true });

      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('-A'), expect.any(Object));
    });

    it('should handle query option', () => {
      const tmux = new TmuxSkill();
      vi.mocked(execSync).mockReturnValue('');

      tmux.findSessions({ query: 'my-session' });

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('-q my-session'),
        expect.any(Object)
      );
    });

    it('should handle empty output', () => {
      const tmux = new TmuxSkill();
      vi.mocked(execSync).mockReturnValue('');

      const sessions = tmux.findSessions();
      expect(sessions).toEqual([]);
    });

    it('should handle malformed output gracefully', () => {
      const tmux = new TmuxSkill();
      const mockOutput = `Some random text
Not a valid session line
Another invalid line`;

      vi.mocked(execSync).mockReturnValue(mockOutput);

      const sessions = tmux.findSessions();
      expect(sessions).toEqual([]);
    });

    it('should handle mixed valid and invalid lines', () => {
      const tmux = new TmuxSkill();
      const mockOutput = `Sessions on socket:
Invalid line
  - valid-session (attached, started Mon Feb 13 10:00:00 2024)
Another invalid line
  - another-valid (detached, started Mon Feb 13 11:00:00 2024)`;

      vi.mocked(execSync).mockReturnValue(mockOutput);

      const sessions = tmux.findSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions[0]?.name).toBe('valid-session');
      expect(sessions[1]?.name).toBe('another-valid');
    });
  });

  describe('waitForText', () => {
    it('should return true when pattern is found', async () => {
      const tmux = new TmuxSkill();
      vi.mocked(execSync).mockReturnValue('');

      const result = await tmux.waitForText('session:0.0', 'Ready');

      expect(result).toBe(true);
    });

    it('should return false when script fails', async () => {
      const tmux = new TmuxSkill();
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Pattern not found');
      });

      const result = await tmux.waitForText('session:0.0', 'NotFound');

      expect(result).toBe(false);
    });

    it('should handle fixed string option', async () => {
      const tmux = new TmuxSkill();
      vi.mocked(execSync).mockReturnValue('');

      await tmux.waitForText('session:0.0', 'exact text', { fixed: true });

      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('-F'), expect.any(Object));
    });

    it('should handle timeout option', async () => {
      const tmux = new TmuxSkill();
      vi.mocked(execSync).mockReturnValue('');

      await tmux.waitForText('session:0.0', 'pattern', { timeout: 60 });

      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('-T 60'), expect.any(Object));
    });

    it('should handle interval option', async () => {
      const tmux = new TmuxSkill();
      vi.mocked(execSync).mockReturnValue('');

      await tmux.waitForText('session:0.0', 'pattern', { interval: 1 });

      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('-i 1'), expect.any(Object));
    });

    it('should handle historyLines option', async () => {
      const tmux = new TmuxSkill();
      vi.mocked(execSync).mockReturnValue('');

      await tmux.waitForText('session:0.0', 'pattern', { historyLines: 500 });

      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('-l 500'), expect.any(Object));
    });

    it('should handle multiple options together', async () => {
      const tmux = new TmuxSkill();
      vi.mocked(execSync).mockReturnValue('');

      await tmux.waitForText('session:0.0', 'pattern', {
        fixed: true,
        timeout: 30,
        interval: 0.5,
        historyLines: 1000,
      });

      //get the most recent call (waitForText, not findSessions)
      const calls = vi.mocked(execSync).mock.calls;
      const lastCall = calls[calls.length - 1];
      const callArg = lastCall?.[0] as string;

      //verify it's calling wait-for-text.sh, not find-sessions.sh
      expect(callArg).toContain('wait-for-text.sh');
      expect(callArg).toContain('-F');
      expect(callArg).toContain('-T 30');
      expect(callArg).toContain('-i 0.5');
      expect(callArg).toContain('-l 1000');
    });
  });
});
