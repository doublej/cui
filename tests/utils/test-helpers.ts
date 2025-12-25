import { vi } from 'vitest';
import { CUIServer } from '@/cui-server';
import { ClaudeAgentService } from '@/services/claude-agent-service';
import { ClaudeHistoryReader } from '@/services/claude-history-reader';
import { ConversationStatusManager } from '@/services/conversation-status-manager';
import { PermissionTracker } from '@/services/permission-tracker';
import { ConfigService } from '@/services/config-service.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Test utilities for isolated testing environment
 */
export class TestHelpers {
  /**
   * Create a test server with isolated configuration
   */
  static createTestServer(config?: {
    port?: number;
  }): CUIServer {
    // Mock ConfigService for tests
    vi.spyOn(ConfigService, 'getInstance').mockReturnValue({
      initialize: vi.fn().mockResolvedValue(undefined),
      getConfig: vi.fn().mockReturnValue({
        machine_id: 'test-machine-12345678',
        server: {
          host: 'localhost',
          port: config?.port || 3001
        },
        logging: {
          level: 'silent'
        }
      })
    });

    return new CUIServer();
  }

  /**
   * Create a test agent service
   */
  static createTestAgentService(): ClaudeAgentService {
    // Create a mock history reader
    const mockHistoryReader = new ClaudeHistoryReader();
    vi.spyOn(mockHistoryReader, 'getConversationWorkingDirectory').mockResolvedValue(process.cwd());

    // Create a mock status tracker
    const mockStatusTracker = new ConversationStatusManager();

    // Create a mock permission tracker
    const mockPermissionTracker = new PermissionTracker();

    const service = new ClaudeAgentService(
      mockHistoryReader,
      mockStatusTracker,
      mockPermissionTracker
    );

    return service;
  }

  /**
   * Setup test logging
   */
  static setupTestLogging(_enabled: boolean = true): void {
    // Note: Logging is now controlled by ConfigService
    // Tests run with silent logging by default
  }

  /**
   * Wait for a condition to be met with timeout
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeoutMs: number = 5000,
    intervalMs: number = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const result = await condition();
      if (result) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Condition not met within ${timeoutMs}ms`);
  }

  /**
   * Create a test server for integration tests (no mocking of internal services)
   */
  static createIntegrationTestServer(config?: {
    port?: number;
    host?: string;
  }): CUIServer {
    const randomPort = config?.port || (3000 + Math.floor(Math.random() * 1000));
    const host = config?.host || 'localhost';

    // Mock ConfigService for integration tests
    vi.spyOn(ConfigService, 'getInstance').mockReturnValue({
      initialize: vi.fn().mockResolvedValue(undefined),
      getConfig: vi.fn().mockReturnValue({
        machine_id: 'test-machine-12345678',
        server: {
          host: host,
          port: randomPort
        },
        logging: {
          level: 'silent'
        }
      })
    });

    // Pass config overrides to ensure the server uses our test port/host
    return new CUIServer({ port: randomPort, host: host });
  }

  /**
   * Wait for streaming messages to be received
   */
  static async waitForStreamingMessages(
    streamingData: string[],
    expectedCount: number,
    timeoutMs: number = 3000
  ): Promise<void> {
    return this.waitFor(
      () => streamingData.length >= expectedCount,
      timeoutMs,
      50 // Check more frequently for faster tests
    );
  }

  static parseStreamingData(rawData: string): unknown[] {
    return rawData
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          console.warn('Failed to parse streaming line:', line);
          return null;
        }
      })
      .filter(Boolean);
  }

  /**
   * Create temporary test directory
   */
  static async createTempTestDir(): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cui-test-'));
    return tempDir;
  }

  /**
   * Cleanup temporary test directory
   */
  static async cleanupTempDir(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors in tests
    }
  }
}
