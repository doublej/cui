import { EventEmitter } from 'events';
import { query, type PermissionResult, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { v4 as uuidv4 } from 'uuid';
import {
  CUIError,
  type ConversationConfig,
  type SystemInitMessage,
  type StreamEvent,
  type PermissionRequest,
} from '$lib/server/types/index.js';
import { createLogger, type Logger } from './logger.js';
import { PermissionTracker } from './permission-tracker.js';
import { ClaudeHistoryReader } from './claude-history-reader.js';
import { ConversationStatusManager } from './conversation-status-manager.js';
import { SessionInfoService } from './session-info-service.js';
import { FileSystemService } from './file-system-service.js';
import { NotificationService } from './notification-service.js';
import { ToolMetricsService } from './ToolMetricsService.js';
import { ClaudeRouterService } from './claude-router-service.js';

const READ_ONLY_TOOLS = ['Read', 'Grep', 'Glob', 'LS', 'LSP'];

interface PermissionDecision {
  status: 'approved' | 'denied';
  modifiedInput?: Record<string, unknown>;
  denyReason?: string;
}

/**
 * Manages Claude Agent SDK queries and their lifecycle
 */
export class ClaudeAgentService extends EventEmitter {
  private activeQueries: Map<string, AbortController> = new Map();
  private sessionMap: Map<string, string> = new Map();
  private permissionPromises: Map<string, {
    resolve: (decision: PermissionDecision) => void;
    reject: (error: Error) => void;
  }> = new Map();
  private logger: Logger;
  private permissionTracker: PermissionTracker;
  private historyReader: ClaudeHistoryReader;
  private statusTracker: ConversationStatusManager;
  private conversationStatusManager?: ConversationStatusManager;
  private toolMetricsService?: ToolMetricsService;
  private sessionInfoService?: SessionInfoService;
  private fileSystemService?: FileSystemService;
  private notificationService?: NotificationService;

  constructor(
    historyReader: ClaudeHistoryReader,
    statusTracker: ConversationStatusManager,
    permissionTracker: PermissionTracker,
    toolMetricsService?: ToolMetricsService,
    sessionInfoService?: SessionInfoService,
    fileSystemService?: FileSystemService
  ) {
    super();
    this.logger = createLogger('ClaudeAgentService');
    this.historyReader = historyReader;
    this.statusTracker = statusTracker;
    this.permissionTracker = permissionTracker;
    this.toolMetricsService = toolMetricsService;
    this.sessionInfoService = sessionInfoService;
    this.fileSystemService = fileSystemService;

    this.setupPermissionTrackerListener();
  }

  setConversationStatusManager(service: ConversationStatusManager): void {
    this.conversationStatusManager = service;
  }

  setNotificationService(service: NotificationService): void {
    this.notificationService = service;
  }

  setRouterService(_service?: ClaudeRouterService): void {
    // Router service not used with SDK - SDK handles API communication directly
    this.logger.debug('Router service set (no-op for SDK mode)');
  }

  /**
   * Listen for permission decisions from PermissionTracker
   */
  private setupPermissionTrackerListener(): void {
    this.permissionTracker.on('permission_updated', (request: PermissionRequest) => {
      const promise = this.permissionPromises.get(request.id);
      if (promise && request.status !== 'pending') {
        promise.resolve({
          status: request.status,
          modifiedInput: request.modifiedInput,
          denyReason: request.denyReason,
        });
        this.permissionPromises.delete(request.id);
      }
    });
  }

  /**
   * Start a new Claude conversation (or resume if resumedSessionId is provided)
   */
  async startConversation(
    config: ConversationConfig & { resumedSessionId?: string }
  ): Promise<{ streamingId: string; systemInit: SystemInitMessage }> {
    const streamingId = uuidv4();
    const abortController = new AbortController();
    this.activeQueries.set(streamingId, abortController);

    this.logger.debug('Starting conversation', {
      streamingId,
      hasInitialPrompt: !!config.initialPrompt,
      workingDirectory: config.workingDirectory,
      model: config.model,
      isResume: !!config.resumedSessionId,
    });

    // If resuming, get the working directory from the original session
    let workingDirectory = config.workingDirectory;
    if (config.resumedSessionId && !workingDirectory) {
      const fetchedDir = await this.historyReader.getConversationWorkingDirectory(
        config.resumedSessionId
      );
      if (!fetchedDir) {
        throw new CUIError(
          'CONVERSATION_NOT_FOUND',
          `Could not find working directory for session ${config.resumedSessionId}`,
          404
        );
      }
      workingDirectory = fetchedDir;
    }

    // Create a promise to capture the system init message
    const systemInitPromise = new Promise<SystemInitMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new CUIError('SYSTEM_INIT_TIMEOUT', 'Timeout waiting for system init', 500));
      }, 60000);

      const handler = ({ streamingId: sid, message }: { streamingId: string; message: StreamEvent }) => {
        if (sid !== streamingId) return;
        if (message.type === 'system' && 'subtype' in message && message.subtype === 'init') {
          clearTimeout(timeout);
          this.removeListener('claude-message', handler);
          resolve(message as SystemInitMessage);
        }
      };

      this.on('claude-message', handler);
    });

    // Start the query in background
    this.executeQuery(streamingId, config, workingDirectory, abortController.signal);

    // Wait for system init
    const systemInit = await systemInitPromise;

    // Register the session
    this.sessionMap.set(streamingId, systemInit.session_id);

    if (this.conversationStatusManager) {
      this.conversationStatusManager.registerActiveSession(streamingId, systemInit.session_id, {
        initialPrompt: config.initialPrompt || '',
        workingDirectory: workingDirectory || process.cwd(),
        model: config.model || 'default',
        inheritedMessages: config.previousMessages,
      });
    } else {
      this.statusTracker.registerActiveSession(streamingId, systemInit.session_id);
    }

    // Set initial git commit head if available
    if (this.sessionInfoService && this.fileSystemService && systemInit.cwd) {
      try {
        if (await this.fileSystemService.isGitRepository(systemInit.cwd)) {
          const gitHead = await this.fileSystemService.getCurrentGitHead(systemInit.cwd);
          if (gitHead) {
            await this.sessionInfoService.updateSessionInfo(systemInit.session_id, {
              initial_commit_head: gitHead,
            });
          }
        }
      } catch (error) {
        this.logger.warn('Failed to set initial commit head', { error });
      }
    }

    this.logger.info('Conversation started', {
      streamingId,
      sessionId: systemInit.session_id,
      model: systemInit.model,
    });

    return { streamingId, systemInit };
  }

  /**
   * Execute the SDK query in background
   */
  private async executeQuery(
    streamingId: string,
    config: ConversationConfig & { resumedSessionId?: string },
    workingDirectory: string,
    signal: AbortSignal
  ): Promise<void> {
    const abortController = new AbortController();

    // Link to our signal
    signal.addEventListener('abort', () => abortController.abort());

    try {
      const response = query({
        prompt: config.initialPrompt,
        options: {
          model: config.model || 'claude-sonnet-4-5',
          cwd: workingDirectory,
          systemPrompt: config.systemPrompt,
          permissionMode: (config.permissionMode as 'default' | 'acceptEdits' | 'bypassPermissions') || 'default',
          resume: config.resumedSessionId,
          tools: config.allowedTools,
          disallowedTools: config.disallowedTools,
          canUseTool: this.createPermissionHandler(streamingId),
          abortController,
        },
      });

      for await (const message of response) {
        if (signal.aborted) break;

        const streamEvent = this.mapToStreamEvent(streamingId, message);
        if (streamEvent) {
          this.emit('claude-message', { streamingId, message: streamEvent });
        }

        // Handle completion (result message)
        if (message.type === 'result') {
          break;
        }
      }

      this.emit('process-closed', { streamingId, code: 0 });
    } catch (error) {
      if (signal.aborted) {
        this.emit('process-closed', { streamingId, code: 0 });
      } else {
        this.logger.error('Query execution error', error);
        this.emit('process-error', { streamingId, error: String(error) });
        this.emit('process-closed', { streamingId, code: 1 });
      }
    } finally {
      this.cleanup(streamingId);
    }
  }

  /**
   * Create permission handler for canUseTool callback
   */
  private createPermissionHandler(streamingId: string) {
    return async (
      toolName: string,
      input: Record<string, unknown>,
      _options: { signal: AbortSignal }
    ): Promise<PermissionResult> => {
      // Auto-allow read-only tools
      if (READ_ONLY_TOOLS.includes(toolName)) {
        return { behavior: 'allow', updatedInput: input };
      }

      this.logger.debug('Permission requested', { streamingId, toolName });

      // Create permission request
      const request = this.permissionTracker.addPermissionRequest(toolName, input, streamingId);

      // Wait for user decision
      try {
        const decision = await this.waitForPermissionDecision(request.id, 60 * 60 * 1000);

        if (decision.status === 'approved') {
          return {
            behavior: 'allow',
            updatedInput: decision.modifiedInput || input,
          };
        } else {
          return {
            behavior: 'deny',
            message: decision.denyReason || 'Permission denied by user',
          };
        }
      } catch (_error) {
        this.logger.warn('Permission request timed out', { toolName, requestId: request.id });
        return {
          behavior: 'deny',
          message: 'Permission request timed out',
        };
      }
    };
  }

  /**
   * Wait for a permission decision from the user
   */
  private waitForPermissionDecision(requestId: string, timeout: number): Promise<PermissionDecision> {
    return new Promise((resolve, reject) => {
      // Check if already resolved
      const request = this.permissionTracker.getPermissionRequest(requestId);
      if (request && request.status !== 'pending') {
        resolve({
          status: request.status,
          modifiedInput: request.modifiedInput,
          denyReason: request.denyReason,
        });
        return;
      }

      // Store promise handlers for later resolution
      this.permissionPromises.set(requestId, { resolve, reject });

      // Set timeout
      setTimeout(() => {
        if (this.permissionPromises.has(requestId)) {
          this.permissionPromises.delete(requestId);
          reject(new Error('Permission request timed out'));
        }
      }, timeout);
    });
  }

  /**
   * Map SDK messages to StreamEvent types
   */
  private mapToStreamEvent(streamingId: string, message: SDKMessage): StreamEvent | null {
    const sessionId = this.sessionMap.get(streamingId) || '';

    switch (message.type) {
      case 'system':
        if (message.subtype === 'init') {
          return {
            type: 'system',
            subtype: 'init',
            session_id: message.session_id || sessionId,
            cwd: message.cwd || '',
            tools: message.tools || [],
            mcp_servers: message.mcp_servers || [],
            model: message.model || 'unknown',
            permissionMode: message.permissionMode || 'default',
            apiKeySource: message.apiKeySource || 'unknown',
          } as SystemInitMessage;
        }
        // Other system subtypes (status, compact_boundary, hook_response) - ignore for now
        return null;

      case 'result':
        return {
          type: 'result',
          subtype: message.subtype,
          session_id: message.session_id || sessionId,
          is_error: message.is_error,
          duration_ms: message.duration_ms || 0,
          duration_api_ms: message.duration_api_ms || 0,
          num_turns: message.num_turns || 0,
          result: 'result' in message ? message.result : undefined,
          usage: message.usage ? {
            input_tokens: message.usage.input_tokens || 0,
            cache_creation_input_tokens: message.usage.cache_creation_input_tokens || 0,
            cache_read_input_tokens: message.usage.cache_read_input_tokens || 0,
            output_tokens: message.usage.output_tokens || 0,
            server_tool_use: { web_search_requests: message.usage.server_tool_use?.web_search_requests || 0 },
          } : {
            input_tokens: 0,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
            output_tokens: 0,
            server_tool_use: { web_search_requests: 0 },
          },
        };

      case 'assistant':
        return {
          type: 'assistant',
          session_id: message.session_id || sessionId,
          message: message.message,
          parent_tool_use_id: message.parent_tool_use_id || undefined,
        } as StreamEvent;

      case 'user':
        return {
          type: 'user',
          session_id: message.session_id || sessionId,
          message: message.message,
          parent_tool_use_id: message.parent_tool_use_id || undefined,
        } as StreamEvent;

      case 'stream_event':
        // Partial streaming events - skip for now
        return null;

      case 'tool_progress':
        // Tool progress events - skip for now
        this.logger.debug('Tool progress', { toolName: message.tool_name, streamingId });
        return null;

      case 'auth_status':
        // Auth status events - skip for now
        return null;

      default:
        this.logger.debug('Unknown message type', { type: (message as SDKMessage).type, streamingId });
        return null;
    }
  }

  /**
   * Stop a conversation
   */
  async stopConversation(streamingId: string): Promise<boolean> {
    const controller = this.activeQueries.get(streamingId);
    if (!controller) {
      this.logger.warn('No active query for streamingId', { streamingId });
      return false;
    }

    controller.abort();
    this.cleanup(streamingId);
    this.logger.info('Conversation stopped', { streamingId });
    return true;
  }

  /**
   * Cleanup resources for a conversation
   */
  private cleanup(streamingId: string): void {
    this.activeQueries.delete(streamingId);
    this.sessionMap.delete(streamingId);

    // Clean up any pending permission promises
    for (const [requestId, promise] of this.permissionPromises.entries()) {
      const request = this.permissionTracker.getPermissionRequest(requestId);
      if (request?.streamingId === streamingId) {
        promise.reject(new Error('Conversation ended'));
        this.permissionPromises.delete(requestId);
      }
    }
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeQueries.keys());
  }

  /**
   * Check if a session is active
   */
  isSessionActive(streamingId: string): boolean {
    return this.activeQueries.has(streamingId);
  }
}
