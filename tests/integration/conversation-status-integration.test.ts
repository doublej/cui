import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { CUIServer } from '@/cui-server';

// Mock the SDK query function
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}));

/**
 * Integration test for conversation status API endpoints
 */
describe('Conversation Status Integration', () => {
  let server: CUIServer;
  let serverPort: number;
  let baseUrl: string;

  beforeAll(async () => {
    // Use a random port to avoid conflicts
    serverPort = 7000 + Math.floor(Math.random() * 1000);
    baseUrl = `http://localhost:${serverPort}`;

    server = new CUIServer({ port: serverPort });
    await server.start();
  }, 15000);

  afterAll(async () => {
    if (server) {
      await server.stop();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, 15000);

  describe('Conversation List API', () => {
    it('should return conversation list with proper structure', async () => {
      const response = await fetch(`${baseUrl}/api/conversations`);

      expect(response.ok).toBe(true);
      const data = await response.json() as { conversations: unknown[]; total: number };

      expect(data).toHaveProperty('conversations');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.conversations)).toBe(true);
      expect(typeof data.total).toBe('number');
    }, 20000);

    it('should verify streamingId field structure in responses', async () => {
      const response = await fetch(`${baseUrl}/api/conversations`);

      expect(response.ok).toBe(true);
      const data = await response.json() as { conversations: Array<{ status: string; streamingId?: string }> };

      // Verify all conversations follow the streamingId rule
      for (const conversation of data.conversations) {
        expect(conversation.status).toBeDefined();
        expect(['completed', 'ongoing', 'pending']).toContain(conversation.status);

        // Only ongoing conversations should have streamingId
        if (conversation.status === 'ongoing') {
          expect(conversation.streamingId).toBeDefined();
          expect(typeof conversation.streamingId).toBe('string');
        } else {
          expect(conversation.streamingId).toBeUndefined();
        }
      }
    });
  });

  describe('System Status API', () => {
    it('should return system status with active conversations count', async () => {
      const response = await fetch(`${baseUrl}/api/system/status`);

      expect(response.ok).toBe(true);
      const data = await response.json() as { activeConversations: number };

      expect(data).toHaveProperty('activeConversations');
      expect(typeof data.activeConversations).toBe('number');
      expect(data.activeConversations).toBeGreaterThanOrEqual(0);
    });
  });
});
