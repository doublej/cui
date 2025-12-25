/**
 * Service registry - singleton instances for all backend services
 */
import { ConfigService } from './config-service.js';
import { SessionInfoService } from './session-info-service.js';
import { ClaudeHistoryReader } from './claude-history-reader.js';
import { ConversationStatusManager } from './conversation-status-manager.js';
import { ToolMetricsService } from './ToolMetricsService.js';
import { FileSystemService } from './file-system-service.js';
import { PermissionTracker } from './permission-tracker.js';
import { ClaudeAgentService } from './claude-agent-service.js';
import { StreamManager } from './stream-manager.js';
import { WorkingDirectoriesService } from './working-directories-service.js';
import { NotificationService } from './notification-service.js';
import { WebPushService } from './web-push-service.js';
import { createLogger } from './logger.js';

const logger = createLogger('ServiceRegistry');

// Service instances
let sessionInfoService: SessionInfoService;
let historyReader: ClaudeHistoryReader;
let conversationStatusManager: ConversationStatusManager;
let toolMetricsService: ToolMetricsService;
let fileSystemService: FileSystemService;
let permissionTracker: PermissionTracker;
let agentService: ClaudeAgentService;
let streamManager: StreamManager;
let workingDirectoriesService: WorkingDirectoriesService;
let notificationService: NotificationService;
let webPushService: WebPushService;

let initialized = false;

export async function initializeServices(): Promise<void> {
	if (initialized) return;

	logger.debug('Initializing services');

	// Initialize config first
	await ConfigService.getInstance().initialize();

	// Initialize services in dependency order
	sessionInfoService = new SessionInfoService();
	historyReader = new ClaudeHistoryReader(sessionInfoService);
	conversationStatusManager = new ConversationStatusManager();
	toolMetricsService = new ToolMetricsService();
	fileSystemService = new FileSystemService();
	permissionTracker = new PermissionTracker();

	agentService = new ClaudeAgentService(
		historyReader,
		conversationStatusManager,
		permissionTracker,
		toolMetricsService,
		sessionInfoService,
		fileSystemService
	);

	streamManager = new StreamManager();
	workingDirectoriesService = new WorkingDirectoriesService(historyReader, logger);
	notificationService = new NotificationService();
	webPushService = WebPushService.getInstance();

	// Wire up integrations
	agentService.setNotificationService(notificationService);
	agentService.setConversationStatusManager(conversationStatusManager);
	permissionTracker.setNotificationService(notificationService);
	permissionTracker.setConversationStatusManager(conversationStatusManager);
	permissionTracker.setHistoryReader(historyReader);

	// Wire stream manager to agent service events
	agentService.on('stream-event', (streamingId: string, event: unknown) => {
		streamManager.broadcast(streamingId, event);
	});

	initialized = true;
	logger.debug('Services initialized successfully');
}

export function getServices() {
	if (!initialized) {
		throw new Error('Services not initialized. Call initializeServices() first.');
	}

	return {
		configService: ConfigService.getInstance(),
		sessionInfoService,
		historyReader,
		conversationStatusManager,
		toolMetricsService,
		fileSystemService,
		permissionTracker,
		agentService,
		streamManager,
		workingDirectoriesService,
		notificationService,
		webPushService
	};
}
