import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { CUIServer } from '@/cui-server';

// Mock the SDK query function
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}));

/**
 * Integration test for SSE streaming protocol
 * Tests basic SSE headers and connection handling
 */
describe('Streaming Integration', () => {
  let server: CUIServer;
  let serverPort: number;
  let baseUrl: string;

  beforeAll(async () => {
    // Use a random port to avoid conflicts
    serverPort = 9000 + Math.floor(Math.random() * 1000);
    baseUrl = `http://localhost:${serverPort}`;

    server = new CUIServer({ port: serverPort });
    await server.start();
  }, 15000);

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  }, 15000);

  describe('SSE Protocol Compliance', () => {
    it('should send proper SSE headers on stream endpoint', async () => {
      // Test stream endpoint returns proper headers even with invalid streamingId
      const streamUrl = `${baseUrl}/api/stream/test-invalid-id`;

      const response = await fetch(streamUrl);

      // Should have SSE content type even for invalid stream
      expect(response.headers.get('content-type')).toBe('text/event-stream');
      expect(response.headers.get('cache-control')).toBe('no-cache');
      expect(response.headers.get('x-accel-buffering')).toBe('no');
    }, 10000);

    it('should handle invalid streamingId gracefully', async () => {
      const streamUrl = `${baseUrl}/api/stream/nonexistent-id`;

      const response = await fetch(streamUrl);

      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toBe('text/event-stream');

      // Read the response body to check for error message
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const { value } = await reader.read();
        if (value) {
          const chunk = decoder.decode(value);
          // Should receive an error message about unknown streaming id
          expect(chunk).toContain('data:');
        }
        reader.releaseLock();
      }
    }, 10000);
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await fetch(`${baseUrl}/api/system/health`);

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.status).toBe('ok');
    });
  });
});
