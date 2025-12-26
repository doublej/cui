import { c as createLogger, C as CUIError, a as ConfigService, l as logger$1 } from "./index3.js";
import fs$1, { existsSync, constants } from "fs";
import * as path from "path";
import path__default from "path";
import * as os from "os";
import os__default from "os";
import Database from "better-sqlite3";
import * as fs from "fs/promises";
import "@anthropic-ai/sdk";
import { EventEmitter } from "events";
import { diffLines } from "diff";
import { exec } from "child_process";
import { promisify } from "util";
import ignore from "ignore";
import { v4 } from "uuid";
import webpush from "web-push";
import { query } from "@anthropic-ai/claude-agent-sdk";
class SessionInfoService {
  static instance;
  logger;
  dbPath;
  configDir;
  isInitialized = false;
  db;
  getSessionStmt;
  insertSessionStmt;
  updateSessionStmt;
  deleteSessionStmt;
  getAllStmt;
  countStmt;
  archiveAllStmt;
  setMetadataStmt;
  getMetadataStmt;
  constructor(customConfigDir) {
    this.logger = createLogger("SessionInfoService");
    this.initializePaths(customConfigDir);
  }
  static getInstance() {
    if (!SessionInfoService.instance) {
      SessionInfoService.instance = new SessionInfoService();
    }
    return SessionInfoService.instance;
  }
  static resetInstance() {
    if (SessionInfoService.instance) {
      SessionInfoService.instance.isInitialized = false;
    }
    SessionInfoService.instance = null;
  }
  initializePaths(customConfigDir) {
    if (customConfigDir) {
      if (customConfigDir === ":memory:") {
        this.configDir = ":memory:";
        this.dbPath = ":memory:";
        return;
      }
      this.configDir = path__default.join(customConfigDir, ".cui");
    } else {
      this.configDir = path__default.join(os__default.homedir(), ".cui");
    }
    this.dbPath = path__default.join(this.configDir, "session-info.db");
    this.logger.debug("Initializing paths", {
      homedir: os__default.homedir(),
      configDir: this.configDir,
      dbPath: this.dbPath
    });
  }
  async initialize() {
    if (this.isInitialized) {
      return;
    }
    try {
      if (this.dbPath !== ":memory:" && !fs$1.existsSync(this.configDir)) {
        fs$1.mkdirSync(this.configDir, { recursive: true });
        this.logger.debug("Created config directory", { dir: this.configDir });
      }
      this.db = new Database(this.dbPath);
      this.db.pragma("journal_mode = WAL");
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          session_id TEXT PRIMARY KEY,
          custom_name TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          version INTEGER NOT NULL,
          pinned INTEGER NOT NULL DEFAULT 0,
          archived INTEGER NOT NULL DEFAULT 0,
          continuation_session_id TEXT NOT NULL DEFAULT '',
          initial_commit_head TEXT NOT NULL DEFAULT '',
          permission_mode TEXT NOT NULL DEFAULT 'default'
        );
        CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      this.prepareStatements();
      this.ensureMetadata();
      this.isInitialized = true;
    } catch (error) {
      this.logger.error("Failed to initialize session info database", error);
      throw new Error(`Session info database initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  prepareStatements() {
    this.getSessionStmt = this.db.prepare("SELECT * FROM sessions WHERE session_id = ?");
    this.insertSessionStmt = this.db.prepare(`
      INSERT INTO sessions (
        session_id,
        custom_name,
        created_at,
        updated_at,
        version,
        pinned,
        archived,
        continuation_session_id,
        initial_commit_head,
        permission_mode
      ) VALUES (
        @session_id,
        @custom_name,
        @created_at,
        @updated_at,
        @version,
        @pinned,
        @archived,
        @continuation_session_id,
        @initial_commit_head,
        @permission_mode
      )
    `);
    this.updateSessionStmt = this.db.prepare(`
      UPDATE sessions SET
        custom_name=@custom_name,
        updated_at=@updated_at,
        pinned=@pinned,
        archived=@archived,
        continuation_session_id=@continuation_session_id,
        initial_commit_head=@initial_commit_head,
        permission_mode=@permission_mode,
        version=@version
      WHERE session_id=@session_id
    `);
    this.deleteSessionStmt = this.db.prepare("DELETE FROM sessions WHERE session_id = ?");
    this.getAllStmt = this.db.prepare("SELECT * FROM sessions");
    this.countStmt = this.db.prepare("SELECT COUNT(*) as count FROM sessions");
    this.archiveAllStmt = this.db.prepare("UPDATE sessions SET archived=1, updated_at=@updated_at WHERE archived=0");
    this.setMetadataStmt = this.db.prepare("INSERT INTO metadata (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
    this.getMetadataStmt = this.db.prepare("SELECT value FROM metadata WHERE key = ?");
  }
  ensureMetadata() {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const schema = this.getMetadataStmt.get("schema_version");
    if (!schema) {
      this.setMetadataStmt.run({ key: "schema_version", value: "3" });
      this.setMetadataStmt.run({ key: "created_at", value: now });
      this.setMetadataStmt.run({ key: "last_updated", value: now });
    }
  }
  mapRow(row) {
    return {
      custom_name: row.custom_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      version: row.version,
      pinned: !!row.pinned,
      archived: !!row.archived,
      continuation_session_id: row.continuation_session_id,
      initial_commit_head: row.initial_commit_head,
      permission_mode: row.permission_mode
    };
  }
  async getSessionInfo(sessionId) {
    try {
      const row = this.getSessionStmt.get(sessionId);
      if (row) {
        return this.mapRow(row);
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const defaultSession = {
        custom_name: "",
        created_at: now,
        updated_at: now,
        version: 3,
        pinned: false,
        archived: false,
        continuation_session_id: "",
        initial_commit_head: "",
        permission_mode: "default"
      };
      this.insertSessionStmt.run({
        session_id: sessionId,
        custom_name: "",
        created_at: now,
        updated_at: now,
        version: 3,
        pinned: 0,
        archived: 0,
        continuation_session_id: "",
        initial_commit_head: "",
        permission_mode: "default"
      });
      this.setMetadataStmt.run({ key: "last_updated", value: now });
      return defaultSession;
    } catch (error) {
      this.logger.error("Failed to get session info", { sessionId, error });
      const now = (/* @__PURE__ */ new Date()).toISOString();
      return {
        custom_name: "",
        created_at: now,
        updated_at: now,
        version: 3,
        pinned: false,
        archived: false,
        continuation_session_id: "",
        initial_commit_head: "",
        permission_mode: "default"
      };
    }
  }
  async updateSessionInfo(sessionId, updates) {
    try {
      const existingRow = this.getSessionStmt.get(sessionId);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (existingRow) {
        const updatedSession = {
          ...this.mapRow(existingRow),
          ...updates,
          updated_at: now
        };
        this.updateSessionStmt.run({
          session_id: sessionId,
          custom_name: updatedSession.custom_name,
          updated_at: updatedSession.updated_at,
          pinned: updatedSession.pinned ? 1 : 0,
          archived: updatedSession.archived ? 1 : 0,
          continuation_session_id: updatedSession.continuation_session_id,
          initial_commit_head: updatedSession.initial_commit_head,
          permission_mode: updatedSession.permission_mode,
          version: updatedSession.version
        });
        this.setMetadataStmt.run({ key: "last_updated", value: now });
        return updatedSession;
      } else {
        const newSession = {
          custom_name: "",
          created_at: now,
          updated_at: now,
          version: 3,
          pinned: false,
          archived: false,
          continuation_session_id: "",
          initial_commit_head: "",
          permission_mode: "default",
          ...updates
        };
        this.insertSessionStmt.run({
          session_id: sessionId,
          custom_name: newSession.custom_name,
          created_at: newSession.created_at,
          updated_at: newSession.updated_at,
          version: newSession.version,
          pinned: newSession.pinned ? 1 : 0,
          archived: newSession.archived ? 1 : 0,
          continuation_session_id: newSession.continuation_session_id,
          initial_commit_head: newSession.initial_commit_head,
          permission_mode: newSession.permission_mode
        });
        this.setMetadataStmt.run({ key: "last_updated", value: now });
        return newSession;
      }
    } catch (error) {
      this.logger.error("Failed to update session info", { sessionId, updates, error });
      throw new Error(`Failed to update session info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async updateCustomName(sessionId, customName) {
    await this.updateSessionInfo(sessionId, { custom_name: customName });
  }
  async deleteSession(sessionId) {
    this.logger.info("Deleting session info", { sessionId });
    try {
      const result = this.deleteSessionStmt.run(sessionId);
      if (result.changes > 0) {
        const now = (/* @__PURE__ */ new Date()).toISOString();
        this.setMetadataStmt.run({ key: "last_updated", value: now });
        this.logger.info("Session info deleted successfully", { sessionId });
      } else {
        this.logger.debug("Session info not found for deletion", { sessionId });
      }
    } catch (error) {
      this.logger.error("Failed to delete session info", { sessionId, error });
      throw new Error(`Failed to delete session info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async getAllSessionInfo() {
    this.logger.debug("Getting all session info");
    try {
      const rows = this.getAllStmt.all();
      const result = {};
      for (const row of rows) {
        result[row.session_id] = this.mapRow(row);
      }
      return result;
    } catch (error) {
      this.logger.error("Failed to get all session info", error);
      return {};
    }
  }
  async getStats() {
    try {
      const countRow = this.countStmt.get();
      let dbSize = 0;
      if (this.dbPath !== ":memory:") {
        try {
          const stats = fs$1.statSync(this.dbPath);
          dbSize = stats.size;
        } catch {
          dbSize = 0;
        }
      }
      const lastUpdatedRow = this.getMetadataStmt.get("last_updated");
      return {
        sessionCount: countRow.count,
        dbSize,
        lastUpdated: lastUpdatedRow?.value || (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      this.logger.error("Failed to get database stats", error);
      return {
        sessionCount: 0,
        dbSize: 0,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  }
  reinitializePaths(customConfigDir) {
    this.initializePaths(customConfigDir);
  }
  getDbPath() {
    return this.dbPath;
  }
  getConfigDir() {
    return this.configDir;
  }
  async archiveAllSessions() {
    this.logger.info("Archiving all sessions");
    try {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const transaction = this.db.transaction(() => {
        const info = this.archiveAllStmt.run({ updated_at: now });
        if (info.changes > 0) {
          this.setMetadataStmt.run({ key: "last_updated", value: now });
        }
        return info.changes;
      });
      const archivedCount = transaction();
      this.logger.info("Sessions archived successfully", { archivedCount });
      return archivedCount;
    } catch (error) {
      this.logger.error("Failed to archive all sessions", error);
      throw new Error(`Failed to archive all sessions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async syncMissingSessions(sessionIds) {
    try {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const insert = this.db.prepare(`
        INSERT OR IGNORE INTO sessions (
          session_id,
          custom_name,
          created_at,
          updated_at,
          version,
          pinned,
          archived,
          continuation_session_id,
          initial_commit_head,
          permission_mode
        ) VALUES (
          @session_id,
          '',
          @now,
          @now,
          3,
          0,
          0,
          '',
          '',
          'default'
        )
      `);
      const transaction = this.db.transaction((ids) => {
        let inserted = 0;
        for (const id of ids) {
          const info = insert.run({ session_id: id, now });
          if (info.changes > 0) inserted++;
        }
        if (inserted > 0) {
          this.setMetadataStmt.run({ key: "last_updated", value: now });
        }
        return inserted;
      });
      return transaction(sessionIds);
    } catch (error) {
      this.logger.error("Failed to sync missing sessions", error);
      throw new Error(`Failed to sync missing sessions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
class ConversationCache {
  cache = null;
  logger;
  parsingPromise = null;
  constructor() {
    this.logger = createLogger("ConversationCache");
  }
  /**
   * Clear the conversation cache to force a refresh on next read
   */
  clear() {
    this.logger.debug("Clearing conversation cache");
    const previousStats = this.cache ? {
      cachedFileCount: this.cache.fileCache.size,
      totalEntries: Array.from(this.cache.fileCache.values()).reduce((sum, cache) => sum + cache.entries.length, 0)
    } : { cachedFileCount: 0, totalEntries: 0 };
    this.cache = null;
    this.parsingPromise = null;
    this.logger.info("Conversation cache cleared", {
      previousStats,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  /**
   * Get cached file entries, combining cached and newly parsed entries
   */
  async getCachedFileEntries(currentFileModTimes, parseFileFunction, getSourceProject) {
    this.logger.debug("Getting cached file entries", {
      hasCachedData: !!this.cache,
      currentFileCount: currentFileModTimes.size
    });
    if (!this.cache) {
      this.cache = {
        fileCache: /* @__PURE__ */ new Map(),
        lastCacheTime: Date.now()
      };
    }
    const allEntries = [];
    let filesFromCache = 0;
    let filesReparsed = 0;
    for (const [filePath, currentMtime] of currentFileModTimes) {
      const cached = this.cache.fileCache.get(filePath);
      if (cached && cached.mtime === currentMtime) {
        const entriesWithSource = cached.entries.map((entry) => ({
          ...entry,
          sourceProject: cached.sourceProject
        }));
        allEntries.push(...entriesWithSource);
        filesFromCache++;
      } else {
        try {
          const entries = await parseFileFunction(filePath);
          const sourceProject = getSourceProject(filePath);
          this.cache.fileCache.set(filePath, {
            entries,
            mtime: currentMtime,
            sourceProject
          });
          const entriesWithSource = entries.map((entry) => ({
            ...entry,
            sourceProject
          }));
          allEntries.push(...entriesWithSource);
          filesReparsed++;
        } catch (error) {
          this.logger.warn("Failed to parse file, skipping", { filePath, error });
          this.cache.fileCache.delete(filePath);
        }
      }
    }
    for (const [cachedFilePath] of this.cache.fileCache) {
      if (!currentFileModTimes.has(cachedFilePath)) {
        this.logger.debug("Removing cache entry for deleted file", { filePath: cachedFilePath });
        this.cache.fileCache.delete(cachedFilePath);
      }
    }
    this.logger.debug("File cache processing complete", {
      totalFiles: currentFileModTimes.size,
      filesFromCache,
      filesReparsed,
      totalEntries: allEntries.length,
      cachedFileCount: this.cache.fileCache.size
    });
    return allEntries;
  }
  /**
   * Update a specific file's cache entry
   */
  updateFileCache(filePath, entries, mtime, sourceProject) {
    if (!this.cache) {
      this.cache = {
        fileCache: /* @__PURE__ */ new Map(),
        lastCacheTime: Date.now()
      };
    }
    this.cache.fileCache.set(filePath, {
      entries,
      mtime,
      sourceProject
    });
    this.logger.debug("File cache updated", {
      filePath,
      entryCount: entries.length,
      sourceProject,
      mtime: new Date(mtime).toISOString()
    });
  }
  /**
   * Clear cache entry for a specific file
   */
  clearFileCache(filePath) {
    if (this.cache?.fileCache.has(filePath)) {
      this.cache.fileCache.delete(filePath);
      this.logger.debug("File cache cleared", { filePath });
    }
  }
  /**
   * Check if a specific file's cache entry is valid
   */
  isFileCacheValid(filePath, currentMtime) {
    if (!this.cache) {
      return false;
    }
    const cached = this.cache.fileCache.get(filePath);
    return cached ? cached.mtime === currentMtime : false;
  }
  /**
   * Get or parse conversations with file-level caching and concurrency protection
   */
  async getOrParseConversations(currentFileModTimes, parseFileFunction, getSourceProject, processAllEntries) {
    this.logger.debug("Request for conversations received", {
      hasCachedData: !!this.cache,
      isCurrentlyParsing: !!this.parsingPromise,
      currentFileCount: currentFileModTimes.size
    });
    if (this.parsingPromise) {
      this.logger.debug("Parsing already in progress, waiting for completion");
      try {
        const result = await this.parsingPromise;
        this.logger.debug("Concurrent parsing completed, returning result", {
          conversationCount: result.length
        });
        return result;
      } catch (error) {
        this.logger.error("Concurrent parsing failed", error);
        this.parsingPromise = null;
      }
    }
    this.parsingPromise = this.executeFileBasedParsing(
      currentFileModTimes,
      parseFileFunction,
      getSourceProject,
      processAllEntries
    );
    try {
      const result = await this.parsingPromise;
      this.parsingPromise = null;
      return result;
    } catch (error) {
      this.parsingPromise = null;
      throw error;
    }
  }
  /**
   * Execute file-based parsing with proper logging
   */
  async executeFileBasedParsing(currentFileModTimes, parseFileFunction, getSourceProject, processAllEntries) {
    const parseStartTime = Date.now();
    this.logger.debug("Executing file-based parsing");
    const allEntries = await this.getCachedFileEntries(
      currentFileModTimes,
      parseFileFunction,
      getSourceProject
    );
    const conversations = processAllEntries(allEntries);
    const parseElapsed = Date.now() - parseStartTime;
    this.logger.debug("File-based parsing completed", {
      conversationCount: conversations.length,
      totalEntries: allEntries.length,
      parseElapsedMs: parseElapsed
    });
    return conversations;
  }
  /**
   * Get cache statistics for monitoring
   */
  getStats() {
    if (!this.cache) {
      return {
        isLoaded: false,
        cachedFileCount: 0,
        totalCachedEntries: 0,
        lastCacheTime: null,
        cacheAge: null,
        isCurrentlyParsing: !!this.parsingPromise,
        fileCacheDetails: []
      };
    }
    const totalCachedEntries = Array.from(this.cache.fileCache.values()).reduce((sum, cache) => sum + cache.entries.length, 0);
    const fileCacheDetails = Array.from(this.cache.fileCache.entries()).map(([filePath, cache]) => ({
      filePath,
      entryCount: cache.entries.length,
      mtime: new Date(cache.mtime).toISOString()
    }));
    return {
      isLoaded: true,
      cachedFileCount: this.cache.fileCache.size,
      totalCachedEntries,
      lastCacheTime: this.cache.lastCacheTime,
      cacheAge: Date.now() - this.cache.lastCacheTime,
      isCurrentlyParsing: !!this.parsingPromise,
      fileCacheDetails
    };
  }
}
class ToolMetricsService extends EventEmitter {
  metrics = /* @__PURE__ */ new Map();
  logger;
  constructor() {
    super();
    this.logger = createLogger("ToolMetricsService");
  }
  /**
   * Start listening to messages from ClaudeProcessManager
   */
  listenToClaudeMessages(processManager) {
    processManager.on("claude-message", ({ streamingId, message }) => {
      this.logger.debug("Received claude-message in ToolMetricsService", {
        streamingId,
        messageType: message?.type,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sessionId: message?.session_id
      });
      this.handleClaudeMessage(streamingId, message);
    });
    this.logger.debug("Started listening to claude-message events");
  }
  /**
   * Get metrics for a specific session
   */
  getMetrics(sessionId) {
    const metrics = this.metrics.get(sessionId);
    return metrics;
  }
  /**
   * Handle Claude messages to extract tool use data
   */
  handleClaudeMessage(streamingId, message) {
    if (message.type === "assistant") {
      const assistantMessage = message;
      this.processAssistantMessage(streamingId, assistantMessage);
    }
  }
  /**
   * Process assistant messages to find tool use blocks
   */
  processAssistantMessage(streamingId, message) {
    this.logger.debug("Processing assistant message", {
      streamingId,
      sessionId: message.session_id,
      hasMessage: !!message.message,
      hasContent: !!message.message?.content,
      contentType: Array.isArray(message.message?.content) ? "array" : typeof message.message?.content
    });
    if (!message.message || !message.message.content) {
      return;
    }
    const content = message.message.content;
    if (Array.isArray(content)) {
      this.logger.debug("Processing content blocks", {
        sessionId: message.session_id,
        blockCount: content.length,
        blockTypes: content.map((b) => b.type)
      });
      content.forEach((block) => {
        if (block.type === "tool_use") {
          this.processToolUse(message.session_id, block);
        }
      });
    }
  }
  /**
   * Process a tool use block to calculate line diffs
   */
  processToolUse(sessionId, toolUse) {
    const toolName = toolUse.name;
    const input = toolUse.input;
    this.logger.debug("Processing tool use", {
      sessionId,
      toolName,
      toolId: toolUse.id,
      inputKeys: Object.keys(input || {})
    });
    const metrics = this.metrics.get(sessionId) || {
      linesAdded: 0,
      linesRemoved: 0,
      editCount: 0,
      writeCount: 0
    };
    if (toolName === "Edit" || toolName === "MultiEdit") {
      if (toolName === "Edit") {
        metrics.editCount++;
        this.calculateEditLineDiff(input, metrics);
      } else {
        const edits = input.edits;
        if (Array.isArray(edits)) {
          metrics.editCount += edits.length;
          edits.forEach((edit) => this.calculateEditLineDiff(edit, metrics));
        }
      }
    } else if (toolName === "Write") {
      metrics.writeCount++;
      const content = input.content;
      if (typeof content === "string") {
        const lines = this.countLines(content);
        metrics.linesAdded += lines;
        this.logger.debug("Write tool processed", {
          sessionId,
          linesAdded: lines,
          contentLength: content.length
        });
      }
    }
    this.metrics.set(sessionId, metrics);
    this.logger.debug("Updated metrics", {
      sessionId,
      metrics
    });
  }
  /**
   * Calculate line diff for an edit operation using proper diff algorithm
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  calculateEditLineDiff(input, metrics) {
    const oldString = input.old_string;
    const newString = input.new_string;
    if (typeof oldString !== "string" || typeof newString !== "string") {
      return;
    }
    const changes = diffLines(oldString, newString, {
      ignoreWhitespace: false,
      newlineIsToken: false
    });
    let linesAdded = 0;
    let linesRemoved = 0;
    changes.forEach((change) => {
      if (change.added) {
        linesAdded += change.count || 0;
      } else if (change.removed) {
        linesRemoved += change.count || 0;
      }
    });
    metrics.linesAdded += linesAdded;
    metrics.linesRemoved += linesRemoved;
  }
  /**
   * Count lines in a string
   */
  countLines(text) {
    if (!text || text.length === 0) {
      return 0;
    }
    const lines = text.split("\n");
    if (lines[lines.length - 1] === "") {
      return lines.length - 1;
    }
    return lines.length;
  }
  /**
   * Calculate metrics from historical conversation messages
   * This is used by ClaudeHistoryReader for past conversations
   */
  calculateMetricsFromMessages(messages) {
    const metrics = {
      linesAdded: 0,
      linesRemoved: 0,
      editCount: 0,
      writeCount: 0
    };
    messages.forEach((msg) => {
      if (msg.type === "assistant" && msg.message) {
        const message = msg.message;
        if (message.content && Array.isArray(message.content)) {
          message.content.forEach((block) => {
            if (block.type === "tool_use") {
              this.processToolUseForMetrics(block, metrics);
            }
          });
        }
      }
    });
    return metrics;
  }
  /**
   * Process tool use for direct metrics calculation (used for historical data)
   */
  processToolUseForMetrics(toolUse, metrics) {
    const toolName = toolUse.name;
    const input = toolUse.input;
    if (toolName === "Edit" || toolName === "MultiEdit") {
      if (toolName === "Edit") {
        metrics.editCount++;
        this.calculateEditLineDiff(input, metrics);
      } else {
        const edits = input.edits;
        if (Array.isArray(edits)) {
          metrics.editCount += edits.length;
          edits.forEach((edit) => this.calculateEditLineDiff(edit, metrics));
        }
      }
    } else if (toolName === "Write") {
      metrics.writeCount++;
      const content = input.content;
      if (typeof content === "string") {
        metrics.linesAdded += this.countLines(content);
      }
    }
  }
}
class MessageFilter {
  logger;
  filteredPrefixes = [
    "Caveat: ",
    "<command-name>",
    "<local-command-stdout>"
  ];
  constructor() {
    this.logger = createLogger("MessageFilter");
  }
  /**
   * Filter an array of conversation messages
   */
  filterMessages(messages) {
    return messages.filter((message) => this.shouldKeepMessage(message));
  }
  /**
   * Determine if a message should be kept (not filtered out)
   */
  shouldKeepMessage(message) {
    if (message.type !== "user") {
      return true;
    }
    const textContent = this.extractTextContent(message.message);
    if (!textContent) {
      return true;
    }
    const shouldFilter = this.filteredPrefixes.some(
      (prefix) => textContent.trim().startsWith(prefix)
    );
    return !shouldFilter;
  }
  /**
   * Extract text content from Anthropic message object
   */
  extractTextContent(message) {
    if (typeof message === "string") {
      return message;
    }
    if (message.content) {
      if (typeof message.content === "string") {
        return message.content;
      }
      if (Array.isArray(message.content)) {
        const textBlock = message.content.find((block) => block.type === "text");
        return textBlock && "text" in textBlock ? textBlock.text : null;
      }
    }
    return null;
  }
}
class ClaudeHistoryReader {
  claudeHomePath;
  logger;
  sessionInfoService;
  conversationCache;
  toolMetricsService;
  messageFilter;
  constructor(sessionInfoService2) {
    this.claudeHomePath = path.join(os.homedir(), ".claude");
    this.logger = createLogger("ClaudeHistoryReader");
    this.sessionInfoService = sessionInfoService2 || new SessionInfoService();
    this.conversationCache = new ConversationCache();
    this.toolMetricsService = new ToolMetricsService();
    this.messageFilter = new MessageFilter();
  }
  get homePath() {
    return this.claudeHomePath;
  }
  /**
   * Clear the conversation cache to force a refresh on next read
   */
  clearCache() {
    this.conversationCache.clear();
  }
  /**
   * List all conversations with optional filtering
   */
  async listConversations(filter) {
    try {
      const conversationChains = await this.parseAllConversations();
      const allConversations = await Promise.all(
        conversationChains.map(async (chain) => {
          let sessionInfo;
          try {
            sessionInfo = await this.sessionInfoService.getSessionInfo(chain.sessionId);
          } catch (error) {
            this.logger.warn("Failed to get session info for conversation", {
              sessionId: chain.sessionId,
              error: error instanceof Error ? error.message : String(error)
            });
            sessionInfo = {
              custom_name: "",
              created_at: (/* @__PURE__ */ new Date()).toISOString(),
              updated_at: (/* @__PURE__ */ new Date()).toISOString(),
              version: 4,
              pinned: false,
              archived: false,
              continuation_session_id: "",
              initial_commit_head: "",
              permission_mode: "default"
            };
          }
          const toolMetrics = this.toolMetricsService.calculateMetricsFromMessages(chain.messages);
          return {
            sessionId: chain.sessionId,
            projectPath: chain.projectPath,
            summary: chain.summary,
            sessionInfo,
            createdAt: chain.createdAt,
            updatedAt: chain.updatedAt,
            messageCount: chain.messages.length,
            totalDuration: chain.totalDuration,
            model: chain.model,
            status: "completed",
            // Default status, will be updated by server
            toolMetrics
          };
        })
      );
      const filtered = this.applyFilters(allConversations, filter);
      const paginated = this.applyPagination(filtered, filter);
      return {
        conversations: paginated,
        total: filtered.length
      };
    } catch (error) {
      throw new CUIError("HISTORY_READ_FAILED", `Failed to read conversation history: ${error}`, 500);
    }
  }
  /**
   * Fetch full conversation details
   */
  async fetchConversation(sessionId) {
    try {
      const conversationChains = await this.parseAllConversations();
      const conversation = conversationChains.find((chain) => chain.sessionId === sessionId);
      if (!conversation) {
        throw new CUIError("CONVERSATION_NOT_FOUND", `Conversation ${sessionId} not found`, 404);
      }
      return this.messageFilter.filterMessages(conversation.messages);
    } catch (error) {
      if (error instanceof CUIError) throw error;
      throw new CUIError("CONVERSATION_READ_FAILED", `Failed to read conversation: ${error}`, 500);
    }
  }
  /**
   * Get conversation metadata
   */
  async getConversationMetadata(sessionId) {
    try {
      const conversationChains = await this.parseAllConversations();
      const conversation = conversationChains.find((chain) => chain.sessionId === sessionId);
      if (!conversation) {
        return null;
      }
      return {
        summary: conversation.summary,
        projectPath: conversation.projectPath,
        model: conversation.model,
        totalDuration: conversation.totalDuration
      };
    } catch (error) {
      this.logger.error("Error getting metadata for conversation", error, { sessionId });
      return null;
    }
  }
  /**
   * Get the working directory for a specific conversation session
   */
  async getConversationWorkingDirectory(sessionId) {
    try {
      const conversationChains = await this.parseAllConversations();
      const conversation = conversationChains.find((chain) => chain.sessionId === sessionId);
      if (!conversation) {
        this.logger.warn("Conversation not found when getting working directory", { sessionId });
        return null;
      }
      this.logger.debug("Found working directory for conversation", {
        sessionId,
        workingDirectory: conversation.projectPath
      });
      return conversation.projectPath;
    } catch (error) {
      this.logger.error("Error getting working directory for conversation", error, { sessionId });
      return null;
    }
  }
  /**
   * Get file modification times for all JSONL files
   */
  async getFileModificationTimes() {
    const modTimes = /* @__PURE__ */ new Map();
    const projectsPath = path.join(this.claudeHomePath, "projects");
    this.logger.debug("Getting file modification times", { projectsPath });
    try {
      const projects = await this.readDirectory(projectsPath);
      this.logger.debug("Found projects", { projectCount: projects.length });
      for (const project of projects) {
        const projectPath = path.join(projectsPath, project);
        const stats = await fs.stat(projectPath);
        if (!stats.isDirectory()) continue;
        const files = await this.readDirectory(projectPath);
        const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));
        for (const file of jsonlFiles) {
          const filePath = path.join(projectPath, file);
          try {
            const fileStats = await fs.stat(filePath);
            modTimes.set(filePath, fileStats.mtimeMs);
          } catch (error) {
            this.logger.warn("Failed to stat file", { filePath, error });
          }
        }
      }
      this.logger.debug("File modification times collection complete", {
        totalFiles: modTimes.size,
        projects: projects.length
      });
    } catch (error) {
      this.logger.error("Error getting file modification times", error);
    }
    return modTimes;
  }
  /**
   * Extract source project name from file path
   */
  extractSourceProject(filePath) {
    const projectsPath = path.join(this.claudeHomePath, "projects");
    const relativePath = path.relative(projectsPath, filePath);
    const segments = relativePath.split(path.sep);
    return segments[0];
  }
  /**
   * Process all entries into conversation chains (the cheap in-memory operations)
   */
  processAllEntries(allEntries) {
    const startTime = Date.now();
    this.logger.debug("Processing all entries into conversations", {
      totalEntries: allEntries.length
    });
    const sessionGroups = this.groupEntriesBySession(allEntries);
    this.logger.debug("Entries grouped by session", {
      sessionCount: sessionGroups.size,
      totalEntries: allEntries.length
    });
    const summaries = this.processSummaries(allEntries);
    this.logger.debug("Summaries processed", {
      summaryCount: summaries.size
    });
    const conversationChains = [];
    for (const [sessionId, entries] of sessionGroups) {
      const chain = this.buildConversationChain(sessionId, entries, summaries);
      if (chain) {
        conversationChains.push(chain);
      }
    }
    const totalElapsed = Date.now() - startTime;
    this.logger.debug("Entry processing complete", {
      conversationCount: conversationChains.length,
      totalElapsedMs: totalElapsed,
      avgTimePerConversation: conversationChains.length > 0 ? totalElapsed / conversationChains.length : 0
    });
    return conversationChains;
  }
  /**
   * Parse all conversations from all JSONL files with file-level caching and concurrency protection
   */
  async parseAllConversations() {
    const startTime = Date.now();
    this.logger.debug("Starting parseAllConversations with file-level caching");
    const currentModTimes = await this.getFileModificationTimes();
    this.logger.debug("Retrieved file modification times", { fileCount: currentModTimes.size });
    const conversations = await this.conversationCache.getOrParseConversations(
      currentModTimes,
      (filePath) => this.parseJsonlFile(filePath),
      // Parse single file
      (filePath) => this.extractSourceProject(filePath),
      // Get source project
      (allEntries) => this.processAllEntries(allEntries)
      // Process entries
    );
    const totalElapsed = Date.now() - startTime;
    this.logger.debug("File-level cached conversation parsing completed", {
      conversationCount: conversations.length,
      totalElapsedMs: totalElapsed
    });
    return conversations;
  }
  /**
   * Parse a single JSONL file and return all valid entries
   */
  async parseJsonlFile(filePath) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());
      const entries = [];
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          entries.push(entry);
        } catch (parseError) {
          this.logger.warn("Failed to parse line from JSONL file", {
            error: parseError,
            filePath,
            line: line.substring(0, 100)
          });
        }
      }
      return entries;
    } catch (error) {
      this.logger.error("Failed to read JSONL file", error, { filePath });
      return [];
    }
  }
  /**
   * Group entries by sessionId
   */
  groupEntriesBySession(entries) {
    const sessionGroups = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      if ((entry.type === "user" || entry.type === "assistant") && entry.sessionId) {
        if (!sessionGroups.has(entry.sessionId)) {
          sessionGroups.set(entry.sessionId, []);
        }
        sessionGroups.get(entry.sessionId).push(entry);
      }
    }
    return sessionGroups;
  }
  /**
   * Process summary entries and create leafUuid mapping
   */
  processSummaries(entries) {
    const summaries = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      if (entry.type === "summary" && entry.leafUuid && entry.summary) {
        summaries.set(entry.leafUuid, entry.summary);
      }
    }
    return summaries;
  }
  async readDirectory(dirPath) {
    try {
      return await fs.readdir(dirPath);
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }
  /**
   * Build a conversation chain from session entries
   */
  buildConversationChain(sessionId, entries, summaries) {
    try {
      const messages = entries.map((entry) => this.parseMessage(entry));
      const orderedMessages = this.buildMessageChain(messages);
      if (orderedMessages.length === 0) {
        return null;
      }
      const filteredMessages = this.messageFilter.filterMessages(orderedMessages);
      if (filteredMessages.length === 0) {
        return null;
      }
      const firstMessage = orderedMessages[0];
      let projectPath = "";
      if (firstMessage.cwd) {
        projectPath = firstMessage.cwd;
      } else {
        const sourceProject = entries[0].sourceProject;
        projectPath = this.decodeProjectPath(sourceProject);
      }
      const summary = this.determineConversationSummary(filteredMessages, summaries);
      const totalDuration = filteredMessages.reduce((sum, msg) => sum + (msg.durationMs || 0), 0);
      const model = this.extractModel(filteredMessages);
      const timestamps = filteredMessages.map((msg) => msg.timestamp).filter((ts) => ts).sort();
      const createdAt = timestamps[0] || (/* @__PURE__ */ new Date()).toISOString();
      const updatedAt = timestamps[timestamps.length - 1] || createdAt;
      return {
        sessionId,
        messages: filteredMessages,
        projectPath,
        summary,
        createdAt,
        updatedAt,
        totalDuration,
        model
      };
    } catch (error) {
      this.logger.error("Error building conversation chain", error, { sessionId });
      return null;
    }
  }
  /**
   * Build ordered message chain using parentUuid relationships
   */
  buildMessageChain(messages) {
    const messageMap = /* @__PURE__ */ new Map();
    messages.forEach((msg) => messageMap.set(msg.uuid, msg));
    const headMessage = messages.find((msg) => !msg.parentUuid);
    if (!headMessage) {
      return messages.sort(
        (a, b) => new Date(a.timestamp || "").getTime() - new Date(b.timestamp || "").getTime()
      );
    }
    const orderedMessages = [];
    const visited = /* @__PURE__ */ new Set();
    const traverse = (currentMessage) => {
      if (visited.has(currentMessage.uuid)) {
        return;
      }
      visited.add(currentMessage.uuid);
      orderedMessages.push(currentMessage);
      const children = messages.filter((msg) => msg.parentUuid === currentMessage.uuid);
      children.sort(
        (a, b) => new Date(a.timestamp || "").getTime() - new Date(b.timestamp || "").getTime()
      );
      children.forEach((child) => traverse(child));
    };
    traverse(headMessage);
    const orphanedMessages = messages.filter((msg) => !visited.has(msg.uuid));
    orderedMessages.push(...orphanedMessages.sort(
      (a, b) => new Date(a.timestamp || "").getTime() - new Date(b.timestamp || "").getTime()
    ));
    return orderedMessages;
  }
  /**
   * Determine conversation summary from messages and summary map
   */
  determineConversationSummary(messages, summaries) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (summaries.has(message.uuid)) {
        return summaries.get(message.uuid);
      }
    }
    const firstUserMessage = messages.find((msg) => msg.type === "user");
    if (firstUserMessage && firstUserMessage.message) {
      const content = this.extractMessageContent(firstUserMessage.message);
      return content.length > 100 ? content.substring(0, 100) + "..." : content;
    }
    return "No summary available";
  }
  /**
   * Extract text content from message object
   */
  extractMessageContent(message) {
    if (typeof message === "string") {
      return message;
    }
    if (message.content) {
      if (typeof message.content === "string") {
        return message.content;
      }
      if (Array.isArray(message.content)) {
        const textBlock = message.content.find((block) => block.type === "text");
        return textBlock && "text" in textBlock ? textBlock.text : "";
      }
    }
    return "No content available";
  }
  /**
   * Extract model information from messages
   */
  extractModel(messages) {
    for (const message of messages) {
      if (message.message && typeof message.message === "object") {
        const messageObj = message.message;
        if (messageObj.model) {
          return messageObj.model;
        }
      }
    }
    return "Unknown";
  }
  parseMessage(entry) {
    return {
      uuid: entry.uuid || "",
      type: entry.type,
      message: entry.message,
      // Non-null assertion since ConversationMessage requires it
      timestamp: entry.timestamp || "",
      sessionId: entry.sessionId || "",
      parentUuid: entry.parentUuid,
      isSidechain: entry.isSidechain,
      userType: entry.userType,
      cwd: entry.cwd,
      version: entry.version,
      durationMs: entry.durationMs
    };
  }
  applyFilters(conversations, filter) {
    if (!filter) return conversations;
    let filtered = [...conversations];
    if (filter.projectPath) {
      filtered = filtered.filter((c) => c.projectPath === filter.projectPath);
    }
    if (filter.hasContinuation !== void 0) {
      filtered = filtered.filter((c) => {
        const hasContinuation = c.sessionInfo.continuation_session_id !== "";
        return filter.hasContinuation ? hasContinuation : !hasContinuation;
      });
    }
    if (filter.archived !== void 0) {
      filtered = filtered.filter((c) => c.sessionInfo.archived === filter.archived);
    }
    if (filter.pinned !== void 0) {
      filtered = filtered.filter((c) => c.sessionInfo.pinned === filter.pinned);
    }
    if (filter.sortBy) {
      filtered.sort((a, b) => {
        const field = filter.sortBy === "created" ? "createdAt" : "updatedAt";
        const aVal = new Date(a[field]).getTime();
        const bVal = new Date(b[field]).getTime();
        return filter.order === "desc" ? bVal - aVal : aVal - bVal;
      });
    }
    return filtered;
  }
  applyPagination(conversations, filter) {
    if (!filter) return conversations;
    const limit = filter.limit || 20;
    const offset = filter.offset || 0;
    return conversations.slice(offset, offset + limit);
  }
  decodeProjectPath(encoded) {
    return encoded.replace(/-/g, "/");
  }
}
class ConversationStatusManager extends EventEmitter {
  // Maps Claude session ID -> CUI streaming ID
  sessionToStreaming = /* @__PURE__ */ new Map();
  // Maps CUI streaming ID -> Claude session ID (reverse lookup)
  streamingToSession = /* @__PURE__ */ new Map();
  // Maps Claude session ID -> conversation context for active sessions
  sessionContext = /* @__PURE__ */ new Map();
  logger;
  constructor() {
    super();
    this.logger = createLogger("ConversationStatusManager");
  }
  /**
   * Register a new active streaming session with optional conversation context
   * This is called when we extract the session_id from the first stream message
   */
  registerActiveSession(streamingId, claudeSessionId, conversationContext) {
    this.logger.debug("Registering active session", {
      streamingId,
      claudeSessionId,
      hasConversationContext: !!conversationContext
    });
    const existingStreamingId = this.sessionToStreaming.get(claudeSessionId);
    if (existingStreamingId && existingStreamingId !== streamingId) {
      this.logger.debug("Removing existing mapping for Claude session", {
        claudeSessionId,
        oldStreamingId: existingStreamingId,
        newStreamingId: streamingId
      });
      this.streamingToSession.delete(existingStreamingId);
    }
    const existingClaudeSessionId = this.streamingToSession.get(streamingId);
    if (existingClaudeSessionId && existingClaudeSessionId !== claudeSessionId) {
      this.logger.debug("Removing existing mapping for streaming ID", {
        streamingId,
        oldClaudeSessionId: existingClaudeSessionId,
        newClaudeSessionId: claudeSessionId
      });
      this.sessionToStreaming.delete(existingClaudeSessionId);
      this.sessionContext.delete(existingClaudeSessionId);
    }
    this.sessionToStreaming.set(claudeSessionId, streamingId);
    this.streamingToSession.set(streamingId, claudeSessionId);
    if (conversationContext) {
      const context = {
        initialPrompt: conversationContext.initialPrompt,
        workingDirectory: conversationContext.workingDirectory,
        model: conversationContext.model || "default",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        inheritedMessages: conversationContext.inheritedMessages
      };
      this.sessionContext.set(claudeSessionId, context);
      this.logger.debug("Stored conversation status context", {
        claudeSessionId,
        hasInitialPrompt: !!context.initialPrompt,
        workingDirectory: context.workingDirectory,
        model: context.model,
        inheritedMessageCount: context.inheritedMessages?.length || 0
      });
    }
    this.logger.debug("Active session registered", {
      streamingId,
      claudeSessionId,
      totalActiveSessions: this.sessionToStreaming.size,
      hasConversationContext: !!conversationContext
    });
    this.emit("session-started", { streamingId, claudeSessionId });
  }
  /**
   * Unregister an active streaming session when it ends
   */
  unregisterActiveSession(streamingId) {
    const claudeSessionId = this.streamingToSession.get(streamingId);
    if (claudeSessionId) {
      this.logger.debug("Unregistering active session", {
        streamingId,
        claudeSessionId
      });
      this.sessionToStreaming.delete(claudeSessionId);
      this.streamingToSession.delete(streamingId);
      this.sessionContext.delete(claudeSessionId);
      this.logger.info("Active session unregistered", {
        streamingId,
        claudeSessionId,
        totalActiveSessions: this.sessionToStreaming.size
      });
      this.emit("session-ended", { streamingId, claudeSessionId });
    } else {
      this.logger.debug("Attempted to unregister unknown streaming session", { streamingId });
    }
  }
  /**
   * Get conversation context for an active session
   */
  getConversationContext(claudeSessionId) {
    const context = this.sessionContext.get(claudeSessionId);
    this.logger.debug("Getting conversation context", {
      claudeSessionId,
      hasContext: !!context
    });
    return context;
  }
  /**
   * Check if a Claude session ID is currently active (has ongoing stream)
   */
  isSessionActive(claudeSessionId) {
    const isActive = this.sessionToStreaming.has(claudeSessionId);
    return isActive;
  }
  /**
   * Get the streaming ID for an active Claude session
   */
  getStreamingId(claudeSessionId) {
    const streamingId = this.sessionToStreaming.get(claudeSessionId);
    this.logger.debug("Getting streaming ID for Claude session", {
      claudeSessionId,
      streamingId: streamingId || "not found"
    });
    return streamingId;
  }
  /**
   * Get the Claude session ID for an active streaming session
   */
  getSessionId(streamingId) {
    const claudeSessionId = this.streamingToSession.get(streamingId);
    this.logger.debug("Getting Claude session ID for streaming ID", {
      streamingId,
      claudeSessionId: claudeSessionId || "not found"
    });
    return claudeSessionId;
  }
  /**
   * Get all active Claude session IDs
   */
  getActiveSessionIds() {
    const sessions = Array.from(this.sessionToStreaming.keys());
    this.logger.debug("Getting all active session IDs", {
      count: sessions.length,
      sessions
    });
    return sessions;
  }
  /**
   * Get all active streaming IDs
   */
  getActiveStreamingIds() {
    const streamingIds = Array.from(this.streamingToSession.keys());
    this.logger.debug("Getting all active streaming IDs", {
      count: streamingIds.length,
      streamingIds
    });
    return streamingIds;
  }
  /**
   * Get conversation status for a Claude session ID
   */
  getConversationStatus(claudeSessionId) {
    const isActive = this.isSessionActive(claudeSessionId);
    const status = isActive ? "ongoing" : "completed";
    return status;
  }
  /**
   * Get conversations that haven't appeared in history yet
   * Used by the conversation list endpoint
   */
  getConversationsNotInHistory(existingSessionIds) {
    const activeSessionIds = this.getActiveSessionIds();
    const conversationsNotInHistory = activeSessionIds.filter((sessionId) => !existingSessionIds.has(sessionId)).map((sessionId) => {
      const context = this.getConversationContext(sessionId);
      const streamingId = this.getStreamingId(sessionId);
      if (context && streamingId) {
        const conversationSummary = {
          sessionId,
          projectPath: context.workingDirectory,
          summary: "",
          // No summary for active conversation
          sessionInfo: {
            custom_name: "",
            // No custom name yet
            created_at: context.timestamp,
            updated_at: context.timestamp,
            version: 4,
            pinned: false,
            archived: false,
            continuation_session_id: "",
            initial_commit_head: "",
            permission_mode: "default"
          },
          createdAt: context.timestamp,
          updatedAt: context.timestamp,
          messageCount: 1,
          // At least the initial user message
          totalDuration: 0,
          // No duration yet
          model: context.model || "unknown",
          status: "ongoing",
          streamingId
        };
        this.logger.debug("Created conversation summary for active session", {
          sessionId,
          streamingId,
          workingDirectory: context.workingDirectory,
          model: context.model
        });
        return conversationSummary;
      }
      return null;
    }).filter((conversation) => conversation !== null);
    this.logger.debug("Generated conversations not in history", {
      activeSessionCount: activeSessionIds.length,
      existingSessionCount: existingSessionIds.size,
      conversationsNotInHistoryCount: conversationsNotInHistory.length
    });
    return conversationsNotInHistory;
  }
  /**
   * Get conversation details if session is active but not in history
   * Used by the conversation details endpoint
   */
  getActiveConversationDetails(sessionId) {
    const isActive = this.isSessionActive(sessionId);
    const context = this.getConversationContext(sessionId);
    this.logger.debug("Checking for active conversation details", {
      sessionId,
      isActive,
      hasContext: !!context
    });
    if (!isActive || !context) {
      return null;
    }
    const messages = [];
    if (context.inheritedMessages) {
      messages.push(...context.inheritedMessages);
    }
    const activeMessage = {
      uuid: `active-${sessionId}-user`,
      type: "user",
      message: {
        role: "user",
        content: context.initialPrompt
      },
      timestamp: context.timestamp,
      sessionId,
      cwd: context.workingDirectory
    };
    messages.push(activeMessage);
    const response = {
      messages,
      summary: "",
      // No summary for active conversation
      projectPath: context.workingDirectory,
      metadata: {
        totalDuration: 0,
        model: context.model || "unknown"
      }
    };
    this.logger.debug("Created active conversation details", {
      sessionId,
      workingDirectory: context.workingDirectory,
      model: context.model,
      totalMessageCount: messages.length,
      inheritedMessageCount: context.inheritedMessages?.length || 0
    });
    return response;
  }
  /**
   * Clear all mappings (useful for testing)
   */
  clear() {
    this.logger.debug("Clearing all session mappings");
    this.sessionToStreaming.clear();
    this.streamingToSession.clear();
    this.sessionContext.clear();
  }
  /**
   * Get statistics about tracked sessions
   */
  getStats() {
    const activeSessions = Array.from(this.sessionToStreaming.entries()).map(
      ([claudeSessionId, streamingId]) => ({ claudeSessionId, streamingId })
    );
    return {
      activeSessionsCount: this.sessionToStreaming.size,
      activeStreamingIdsCount: this.streamingToSession.size,
      activeContextsCount: this.sessionContext.size,
      activeSessions
    };
  }
}
const execAsync = promisify(exec);
class FileSystemService {
  logger;
  maxFileSize = 10 * 1024 * 1024;
  // 10MB default
  allowedBasePaths = [];
  // Empty means all paths allowed
  constructor(maxFileSize, allowedBasePaths) {
    this.logger = createLogger("FileSystemService");
    if (maxFileSize !== void 0) {
      this.maxFileSize = maxFileSize;
    }
    if (allowedBasePaths) {
      this.allowedBasePaths = allowedBasePaths.map((p) => path.normalize(p));
    }
  }
  /**
   * List directory contents with security checks
   */
  async listDirectory(requestedPath, recursive = false, respectGitignore = false) {
    this.logger.debug("List directory requested", { requestedPath, recursive, respectGitignore });
    try {
      const safePath = await this.validatePath(requestedPath);
      const stats = await fs.stat(safePath);
      if (!stats.isDirectory()) {
        throw new CUIError("NOT_A_DIRECTORY", `Path is not a directory: ${requestedPath}`, 400);
      }
      let ig = null;
      if (respectGitignore) {
        ig = await this.loadGitignore(safePath);
      }
      const entries = recursive ? await this.listDirectoryRecursive(safePath, safePath, ig) : await this.listDirectoryFlat(safePath, ig);
      entries.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      this.logger.debug("Directory listed successfully", {
        path: safePath,
        entryCount: entries.length,
        recursive,
        respectGitignore
      });
      return {
        path: safePath,
        entries,
        total: entries.length
      };
    } catch (error) {
      if (error instanceof CUIError) {
        throw error;
      }
      const errorCode = error.code;
      if (errorCode === "ENOENT") {
        throw new CUIError("PATH_NOT_FOUND", `Path not found: ${requestedPath}`, 404);
      } else if (errorCode === "EACCES") {
        throw new CUIError("ACCESS_DENIED", `Access denied to path: ${requestedPath}`, 403);
      }
      this.logger.error("Error listing directory", error, { requestedPath });
      throw new CUIError("LIST_DIRECTORY_FAILED", `Failed to list directory: ${error}`, 500);
    }
  }
  /**
   * Read file contents with security checks
   */
  async readFile(requestedPath) {
    this.logger.debug("Read file requested", { requestedPath });
    try {
      const safePath = await this.validatePath(requestedPath);
      const stats = await fs.stat(safePath);
      if (!stats.isFile()) {
        throw new CUIError("NOT_A_FILE", `Path is not a file: ${requestedPath}`, 400);
      }
      if (stats.size > this.maxFileSize) {
        throw new CUIError(
          "FILE_TOO_LARGE",
          `File size (${stats.size} bytes) exceeds maximum allowed size (${this.maxFileSize} bytes)`,
          400
        );
      }
      const content = await fs.readFile(safePath, "utf-8");
      if (!this.isValidUtf8(content)) {
        throw new CUIError("BINARY_FILE", "File appears to be binary or not valid UTF-8", 400);
      }
      this.logger.debug("File read successfully", {
        path: safePath,
        size: stats.size
      });
      return {
        path: safePath,
        content,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        encoding: "utf-8"
      };
    } catch (error) {
      if (error instanceof CUIError) {
        throw error;
      }
      const errorCode = error.code;
      if (errorCode === "ENOENT") {
        throw new CUIError("FILE_NOT_FOUND", `File not found: ${requestedPath}`, 404);
      } else if (errorCode === "EACCES") {
        throw new CUIError("ACCESS_DENIED", `Access denied to file: ${requestedPath}`, 403);
      }
      this.logger.error("Error reading file", error, { requestedPath });
      throw new CUIError("READ_FILE_FAILED", `Failed to read file: ${error}`, 500);
    }
  }
  /**
   * Validate and normalize a path to prevent path traversal attacks
   */
  async validatePath(requestedPath) {
    if (!path.isAbsolute(requestedPath)) {
      throw new CUIError("INVALID_PATH", "Path must be absolute", 400);
    }
    if (requestedPath.includes("..")) {
      this.logger.warn("Path traversal attempt detected", {
        requestedPath
      });
      throw new CUIError("PATH_TRAVERSAL_DETECTED", "Invalid path: path traversal detected", 400);
    }
    const normalizedPath = path.normalize(requestedPath);
    if (this.allowedBasePaths.length > 0) {
      const isAllowed = this.allowedBasePaths.some(
        (basePath) => normalizedPath.startsWith(basePath)
      );
      if (!isAllowed) {
        this.logger.warn("Path outside allowed directories", {
          requestedPath,
          normalizedPath,
          allowedBasePaths: this.allowedBasePaths
        });
        throw new CUIError("PATH_NOT_ALLOWED", "Path is outside allowed directories", 403);
      }
    }
    const segments = normalizedPath.split(path.sep);
    for (const segment of segments) {
      if (!segment) continue;
      if (segment.startsWith(".")) {
        this.logger.warn("Hidden file/directory detected", {
          requestedPath,
          segment
        });
        throw new CUIError("INVALID_PATH", "Path contains hidden files/directories", 400);
      }
      if (segment.includes("\0")) {
        this.logger.warn("Null byte detected in path", {
          requestedPath,
          segment
        });
        throw new CUIError("INVALID_PATH", "Path contains null bytes", 400);
      }
      if (/[<>:|?*]/.test(segment)) {
        this.logger.warn("Invalid characters detected in path", {
          requestedPath,
          segment
        });
        throw new CUIError("INVALID_PATH", "Path contains invalid characters", 400);
      }
    }
    this.logger.debug("Path validated successfully", {
      requestedPath,
      normalizedPath
    });
    return normalizedPath;
  }
  /**
   * Check if content appears to be valid UTF-8 text
   */
  isValidUtf8(content) {
    if (content.includes("\0")) {
      return false;
    }
    for (let i = 0; i < content.length; i++) {
      const charCode = content.charCodeAt(i);
      if (charCode >= 1 && charCode <= 8 || charCode >= 11 && charCode <= 12 || charCode >= 14 && charCode <= 31) {
        return false;
      }
    }
    return true;
  }
  /**
   * List directory contents without recursion
   */
  async listDirectoryFlat(dirPath, ig) {
    const dirents = await fs.readdir(dirPath, { withFileTypes: true });
    const entries = [];
    for (const dirent of dirents) {
      if (ig && ig.ignores(dirent.name)) {
        continue;
      }
      const fullPath = path.join(dirPath, dirent.name);
      const stats = await fs.stat(fullPath);
      entries.push({
        name: dirent.name,
        type: dirent.isDirectory() ? "directory" : "file",
        size: dirent.isFile() ? stats.size : void 0,
        lastModified: stats.mtime.toISOString()
      });
    }
    return entries;
  }
  /**
   * List directory contents recursively
   */
  async listDirectoryRecursive(dirPath, basePath, ig) {
    const entries = [];
    async function traverse(currentPath) {
      const dirents = await fs.readdir(currentPath, { withFileTypes: true });
      for (const dirent of dirents) {
        const fullPath = path.join(currentPath, dirent.name);
        const relativePath = path.relative(basePath, fullPath);
        if (ig && ig.ignores(relativePath)) {
          continue;
        }
        const stats = await fs.stat(fullPath);
        entries.push({
          name: relativePath,
          type: dirent.isDirectory() ? "directory" : "file",
          size: dirent.isFile() ? stats.size : void 0,
          lastModified: stats.mtime.toISOString()
        });
        if (dirent.isDirectory()) {
          await traverse(fullPath);
        }
      }
    }
    await traverse(dirPath);
    return entries;
  }
  /**
   * Load gitignore patterns from a directory and its parents
   */
  async loadGitignore(dirPath) {
    const ig = ignore();
    try {
      const gitignorePath = path.join(dirPath, ".gitignore");
      const content = await fs.readFile(gitignorePath, "utf-8");
      ig.add(content);
      this.logger.debug("Loaded .gitignore", { path: gitignorePath });
    } catch (error) {
      const errorCode = error.code;
      if (errorCode !== "ENOENT") {
        this.logger.debug("Error reading .gitignore", { error, path: dirPath });
      }
    }
    ig.add(".git");
    return ig;
  }
  /**
   * Check if a directory is a git repository
   */
  async isGitRepository(dirPath) {
    try {
      await execAsync("git rev-parse --git-dir", { cwd: dirPath });
      return true;
    } catch (error) {
      this.logger.debug("Directory is not a git repository", { dirPath, error });
      return false;
    }
  }
  /**
   * Get current git HEAD commit hash
   */
  async getCurrentGitHead(dirPath) {
    try {
      const { stdout } = await execAsync("git rev-parse HEAD", { cwd: dirPath });
      return stdout.trim();
    } catch (error) {
      this.logger.debug("Failed to get git HEAD", { dirPath, error });
      return null;
    }
  }
  /**
   * Validate that an executable exists and has executable permissions
   */
  async validateExecutable(executablePath) {
    this.logger.debug("Validating executable", { executablePath });
    try {
      if (!existsSync(executablePath)) {
        throw new CUIError(
          "EXECUTABLE_NOT_FOUND",
          `Executable not found: ${executablePath}`,
          404
        );
      }
      try {
        await fs.access(executablePath, constants.X_OK);
      } catch (_error) {
        throw new CUIError(
          "NOT_EXECUTABLE",
          `File exists but is not executable: ${executablePath}`,
          403
        );
      }
      this.logger.debug("Executable validation successful", { executablePath });
    } catch (error) {
      if (error instanceof CUIError) {
        throw error;
      }
      this.logger.error("Error validating executable", error, { executablePath });
      throw new CUIError(
        "EXECUTABLE_VALIDATION_FAILED",
        `Failed to validate executable: ${error}`,
        500
      );
    }
  }
}
class WebPushService {
  static instance;
  logger;
  db;
  dbPath;
  configDir;
  isInitialized = false;
  configService;
  insertStmt;
  deleteStmt;
  upsertSeenStmt;
  listStmt;
  countStmt;
  constructor(customConfigDir) {
    this.logger = createLogger("WebPushService");
    this.configService = ConfigService.getInstance();
    this.initializePaths(customConfigDir);
  }
  static getInstance() {
    if (!WebPushService.instance) {
      WebPushService.instance = new WebPushService();
    }
    return WebPushService.instance;
  }
  initializePaths(customConfigDir) {
    const baseConfigDir = customConfigDir || path__default.join(os__default.homedir(), ".cui");
    this.configDir = baseConfigDir;
    this.dbPath = path__default.join(baseConfigDir, "web-push.db");
    this.logger.debug("Initialized web push database paths", {
      dir: this.configDir,
      dbPath: this.dbPath
    });
  }
  async initialize() {
    if (this.isInitialized) return;
    try {
      if (this.dbPath !== ":memory:" && !fs$1.existsSync(this.configDir)) {
        fs$1.mkdirSync(this.configDir, { recursive: true });
      }
      this.db = new Database(this.dbPath);
      this.db.pragma("journal_mode = WAL");
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          endpoint TEXT PRIMARY KEY,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          user_agent TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          last_seen TEXT NOT NULL,
          expired INTEGER NOT NULL DEFAULT 0
        );
      `);
      this.prepareStatements();
      this.configureVapid();
      this.isInitialized = true;
    } catch (error) {
      this.logger.error("Failed to initialize web push database", error);
      throw new Error(`WebPush database initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  prepareStatements() {
    this.insertStmt = this.db.prepare(
      "INSERT OR REPLACE INTO subscriptions (endpoint, p256dh, auth, user_agent, created_at, last_seen, expired) VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM subscriptions WHERE endpoint = ?), ?), ?, 0)"
    );
    this.deleteStmt = this.db.prepare("DELETE FROM subscriptions WHERE endpoint = ?");
    this.upsertSeenStmt = this.db.prepare("UPDATE subscriptions SET last_seen = ?, expired = ? WHERE endpoint = ?");
    this.listStmt = this.db.prepare("SELECT * FROM subscriptions WHERE expired = 0");
    this.countStmt = this.db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE expired = 0");
  }
  configureVapid() {
    const config = this.configService.getConfig();
    const subject = config.interface.notifications?.webPush?.subject || "mailto:admin@example.com";
    let publicKey = config.interface.notifications?.webPush?.vapidPublicKey;
    let privateKey = config.interface.notifications?.webPush?.vapidPrivateKey;
    let generated = false;
    if (this.getEnabled() && (!publicKey || !privateKey)) {
      try {
        const keys = webpush.generateVAPIDKeys();
        publicKey = keys.publicKey;
        privateKey = keys.privateKey;
        void this.configService.updateConfig({
          interface: {
            ...config.interface,
            notifications: {
              ...config.interface.notifications || { enabled: true },
              webPush: {
                subject,
                vapidPublicKey: publicKey,
                vapidPrivateKey: privateKey
              }
            }
          }
        }).catch((_err) => {
          this.logger.warn("Failed to persist generated VAPID keys to config");
        });
        this.logger.info("Generated and applied VAPID keys");
        generated = true;
      } catch (_e) {
        this.logger.error("Failed to generate VAPID keys");
      }
    }
    if (!publicKey || !privateKey) {
      this.logger.warn("Web Push VAPID keys are not configured. Native push will be disabled until set in config");
      return;
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
    if (generated) {
      try {
        this.db.prepare("UPDATE subscriptions SET expired = 1").run();
        this.logger.info("Expired all existing web push subscriptions due to VAPID key generation");
      } catch (_e) {
        this.logger.warn("Failed to expire existing subscriptions after VAPID key generation");
      }
    }
  }
  getPublicKey() {
    const publicKey = this.configService.getConfig().interface.notifications?.webPush?.vapidPublicKey || null;
    return publicKey || null;
  }
  getEnabled() {
    const enabled = this.configService.getConfig().interface.notifications?.enabled ?? false;
    return enabled;
  }
  getSubscriptionCount() {
    const row = this.countStmt.get();
    return row?.count || 0;
  }
  addOrUpdateSubscription(subscription, userAgent = "") {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { endpoint, keys } = subscription;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new Error("Invalid subscription payload: missing endpoint/keys");
    }
    this.insertStmt.run(endpoint, keys.p256dh, keys.auth, userAgent || "", endpoint, now, now);
  }
  removeSubscriptionByEndpoint(endpoint) {
    this.deleteStmt.run(endpoint);
  }
  listSubscriptions() {
    return this.listStmt.all();
  }
  async broadcast(payload) {
    await this.initialize();
    const subs = this.listSubscriptions();
    let sent = 0;
    let failed = 0;
    await Promise.all(
      subs.map(async (row) => {
        const sub = {
          endpoint: row.endpoint,
          expirationTime: null,
          keys: { p256dh: row.p256dh, auth: row.auth }
        };
        try {
          await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 });
          this.upsertSeenStmt.run((/* @__PURE__ */ new Date()).toISOString(), 0, row.endpoint);
          sent += 1;
        } catch (_err) {
          failed += 1;
          const status = void 0;
          {
            this.logger.error("Failed sending web push notification", { endpoint: row.endpoint, statusCode: status });
          }
        }
      })
    );
    return { sent, failed };
  }
}
class NotificationService {
  logger;
  configService;
  machineId = null;
  webPushService;
  constructor() {
    this.logger = createLogger("NotificationService");
    this.configService = ConfigService.getInstance();
    this.webPushService = WebPushService.getInstance();
  }
  /**
   * Get machine ID from config
   */
  getMachineId() {
    if (!this.machineId) {
      try {
        const config = this.configService.getConfig();
        this.machineId = config.machine_id;
      } catch (error) {
        this.logger.error("Failed to get machine ID from config", error);
        this.machineId = "unknown";
      }
    }
    return this.machineId;
  }
  /**
   * Check if notifications are enabled
   */
  async isEnabled() {
    const config = this.configService.getConfig();
    return config.interface.notifications?.enabled ?? false;
  }
  /**
   * Get the ntfy URL from preferences
   */
  async getNtfyUrl() {
    const config = this.configService.getConfig();
    return config.interface.notifications?.ntfyUrl || "https://ntfy.sh";
  }
  /**
   * Send a notification for a permission request
   */
  async sendPermissionNotification(request, sessionId, summary) {
    if (!await this.isEnabled()) {
      this.logger.debug("Notifications disabled, skipping permission notification");
      return;
    }
    try {
      const machineId = this.getMachineId();
      const topic = `cui-${machineId}`;
      const ntfyUrl = await this.getNtfyUrl();
      const notification = {
        title: "CUI Permission Request",
        message: summary ? `${summary} - ${request.toolName}` : `${request.toolName} tool: ${JSON.stringify(request.toolInput).substring(0, 100)}...`,
        priority: "default",
        tags: ["cui-permission"],
        sessionId: sessionId || "unknown",
        streamingId: request.streamingId,
        permissionRequestId: request.id
      };
      await this.sendNotification(ntfyUrl, topic, notification);
      try {
        await this.webPushService.initialize();
        if (this.webPushService.getEnabled()) {
          await this.webPushService.broadcast({
            title: notification.title,
            message: notification.message,
            tag: notification.tags[0],
            data: {
              sessionId: notification.sessionId,
              streamingId: notification.streamingId,
              permissionRequestId: notification.permissionRequestId,
              type: "permission"
            }
          });
        }
      } catch (err) {
        this.logger.debug("Web push broadcast failed (non-fatal)", { error: err?.message });
      }
      this.logger.info("Permission notification sent", {
        requestId: request.id,
        toolName: request.toolName,
        topic
      });
    } catch (error) {
      this.logger.error("Failed to send permission notification", error, {
        requestId: request.id
      });
    }
  }
  /**
   * Send a notification when a conversation ends
   */
  async sendConversationEndNotification(streamingId, sessionId, summary) {
    if (!await this.isEnabled()) {
      this.logger.debug("Notifications disabled, skipping conversation end notification");
      return;
    }
    try {
      const machineId = this.getMachineId();
      const topic = `cui-${machineId}`;
      const ntfyUrl = await this.getNtfyUrl();
      const notification = {
        title: "Task Finished",
        message: summary || "Task completed",
        priority: "default",
        tags: ["cui-complete"],
        sessionId,
        streamingId
      };
      await this.sendNotification(ntfyUrl, topic, notification);
      try {
        await this.webPushService.initialize();
        if (this.webPushService.getEnabled()) {
          await this.webPushService.broadcast({
            title: notification.title,
            message: notification.message,
            tag: notification.tags[0],
            data: {
              sessionId: notification.sessionId,
              streamingId: notification.streamingId,
              type: "conversation-end"
            }
          });
        }
      } catch (err) {
        this.logger.debug("Web push broadcast failed (non-fatal)", { error: err?.message });
      }
      this.logger.info("Conversation end notification sent", {
        sessionId,
        streamingId,
        topic
      });
    } catch (error) {
      this.logger.error("Failed to send conversation end notification", error, {
        sessionId,
        streamingId
      });
    }
  }
  /**
   * Send a notification to ntfy
   */
  async sendNotification(ntfyUrl, topic, notification) {
    const url = `${ntfyUrl}/${topic}`;
    const headers = {
      "Title": notification.title,
      "Priority": notification.priority,
      "Tags": notification.tags.join(",")
    };
    headers["X-CUI-SessionId"] = notification.sessionId;
    headers["X-CUI-StreamingId"] = notification.streamingId;
    if (notification.permissionRequestId) {
      headers["X-CUI-PermissionRequestId"] = notification.permissionRequestId;
    }
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: notification.message
    });
    if (!response.ok) {
      throw new Error(`Ntfy returned ${response.status}: ${await response.text()}`);
    }
  }
}
class PermissionTracker extends EventEmitter {
  permissionRequests = /* @__PURE__ */ new Map();
  notificationService;
  conversationStatusManager;
  historyReader;
  constructor() {
    super();
  }
  /**
   * Set the notification service
   */
  setNotificationService(service) {
    this.notificationService = service;
  }
  /**
   * Set the conversation status manager
   */
  setConversationStatusManager(manager) {
    this.conversationStatusManager = manager;
  }
  /**
   * Set the history reader
   */
  setHistoryReader(reader) {
    this.historyReader = reader;
  }
  /**
   * Add a new permission request
   */
  addPermissionRequest(toolName, toolInput, streamingId) {
    const id = v4();
    const request = {
      id,
      streamingId: streamingId || "unknown",
      toolName,
      toolInput,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: "pending"
    };
    this.permissionRequests.set(id, request);
    logger$1.info("Permission request added", { id, toolName, streamingId });
    this.emit("permission_request", request);
    if (this.notificationService && this.conversationStatusManager && this.historyReader) {
      const sessionId = this.conversationStatusManager.getSessionId(streamingId || "");
      if (sessionId) {
        this.historyReader.getConversationMetadata(sessionId).then((metadata) => {
          if (this.notificationService) {
            return this.notificationService.sendPermissionNotification(
              request,
              sessionId,
              metadata?.summary
            );
          }
        }).catch((error) => {
          logger$1.error("Failed to fetch conversation metadata for notification", error);
          if (this.notificationService) {
            this.notificationService.sendPermissionNotification(request, sessionId).catch((err) => logger$1.error("Failed to send permission notification", err));
          }
        });
      } else {
        this.notificationService.sendPermissionNotification(request).catch((error) => {
          logger$1.error("Failed to send permission notification", error);
        });
      }
    }
    return request;
  }
  /**
   * Get all permission requests
   */
  getAllPermissionRequests() {
    return Array.from(this.permissionRequests.values());
  }
  /**
   * Get permission requests filtered by criteria
   */
  getPermissionRequests(filter) {
    let requests = Array.from(this.permissionRequests.values());
    if (filter?.streamingId) {
      requests = requests.filter((req) => req.streamingId === filter.streamingId);
    }
    if (filter?.status) {
      requests = requests.filter((req) => req.status === filter.status);
    }
    return requests;
  }
  /**
   * Get a specific permission request by ID
   */
  getPermissionRequest(id) {
    return this.permissionRequests.get(id);
  }
  /**
   * Update permission request status (for future use when we implement approval/denial)
   */
  updatePermissionStatus(id, status, options) {
    const request = this.permissionRequests.get(id);
    if (!request) {
      logger$1.warn("Permission request not found", { id });
      return false;
    }
    request.status = status;
    if (status === "approved" && options?.modifiedInput) {
      request.modifiedInput = options.modifiedInput;
    }
    if (status === "denied" && options?.denyReason) {
      request.denyReason = options.denyReason;
    }
    logger$1.info("Permission request updated", { id, status });
    this.emit("permission_updated", request);
    return true;
  }
  /**
   * Clear all permission requests (for testing)
   */
  clear() {
    this.permissionRequests.clear();
  }
  /**
   * Get the number of permission requests
   */
  size() {
    return this.permissionRequests.size;
  }
  /**
   * Remove all permissions for a specific streaming ID
   * Used for cleanup when a conversation ends
   */
  removePermissionsByStreamingId(streamingId) {
    const toRemove = [];
    for (const [id, request] of this.permissionRequests.entries()) {
      if (request.streamingId === streamingId) {
        toRemove.push(id);
      }
    }
    toRemove.forEach((id) => this.permissionRequests.delete(id));
    if (toRemove.length > 0) {
      logger$1.info("Removed permissions for streaming session", {
        streamingId,
        removedCount: toRemove.length
      });
    }
    return toRemove.length;
  }
}
const READ_ONLY_TOOLS = ["Read", "Grep", "Glob", "LS", "LSP"];
class ClaudeAgentService extends EventEmitter {
  activeQueries = /* @__PURE__ */ new Map();
  sessionMap = /* @__PURE__ */ new Map();
  permissionPromises = /* @__PURE__ */ new Map();
  logger;
  permissionTracker;
  historyReader;
  statusTracker;
  conversationStatusManager;
  toolMetricsService;
  sessionInfoService;
  fileSystemService;
  notificationService;
  constructor(historyReader2, statusTracker, permissionTracker2, toolMetricsService2, sessionInfoService2, fileSystemService2) {
    super();
    this.logger = createLogger("ClaudeAgentService");
    this.historyReader = historyReader2;
    this.statusTracker = statusTracker;
    this.permissionTracker = permissionTracker2;
    this.toolMetricsService = toolMetricsService2;
    this.sessionInfoService = sessionInfoService2;
    this.fileSystemService = fileSystemService2;
    this.setupPermissionTrackerListener();
  }
  setConversationStatusManager(service) {
    this.conversationStatusManager = service;
  }
  setNotificationService(service) {
    this.notificationService = service;
  }
  setRouterService(_service) {
    this.logger.debug("Router service set (no-op for SDK mode)");
  }
  /**
   * Listen for permission decisions from PermissionTracker
   */
  setupPermissionTrackerListener() {
    this.permissionTracker.on("permission_updated", (request) => {
      const promise = this.permissionPromises.get(request.id);
      if (promise && request.status !== "pending") {
        promise.resolve({
          status: request.status,
          modifiedInput: request.modifiedInput,
          denyReason: request.denyReason
        });
        this.permissionPromises.delete(request.id);
      }
    });
  }
  /**
   * Start a new Claude conversation (or resume if resumedSessionId is provided)
   */
  async startConversation(config) {
    const streamingId = v4();
    const abortController = new AbortController();
    this.activeQueries.set(streamingId, abortController);
    this.logger.debug("Starting conversation", {
      streamingId,
      hasInitialPrompt: !!config.initialPrompt,
      workingDirectory: config.workingDirectory,
      model: config.model,
      isResume: !!config.resumedSessionId
    });
    let workingDirectory = config.workingDirectory;
    if (config.resumedSessionId && !workingDirectory) {
      const fetchedDir = await this.historyReader.getConversationWorkingDirectory(
        config.resumedSessionId
      );
      if (!fetchedDir) {
        throw new CUIError(
          "CONVERSATION_NOT_FOUND",
          `Could not find working directory for session ${config.resumedSessionId}`,
          404
        );
      }
      workingDirectory = fetchedDir;
    }
    const systemInitPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new CUIError("SYSTEM_INIT_TIMEOUT", "Timeout waiting for system init", 500));
      }, 6e4);
      const handler = ({ streamingId: sid, message }) => {
        if (sid !== streamingId) return;
        if (message.type === "system" && "subtype" in message && message.subtype === "init") {
          clearTimeout(timeout);
          this.removeListener("claude-message", handler);
          resolve(message);
        }
      };
      this.on("claude-message", handler);
    });
    this.executeQuery(streamingId, config, workingDirectory, abortController.signal);
    const systemInit = await systemInitPromise;
    this.sessionMap.set(streamingId, systemInit.session_id);
    if (this.conversationStatusManager) {
      this.conversationStatusManager.registerActiveSession(streamingId, systemInit.session_id, {
        initialPrompt: config.initialPrompt || "",
        workingDirectory: workingDirectory || process.cwd(),
        model: config.model || "default",
        inheritedMessages: config.previousMessages
      });
    } else {
      this.statusTracker.registerActiveSession(streamingId, systemInit.session_id);
    }
    if (this.sessionInfoService && this.fileSystemService && systemInit.cwd) {
      try {
        if (await this.fileSystemService.isGitRepository(systemInit.cwd)) {
          const gitHead = await this.fileSystemService.getCurrentGitHead(systemInit.cwd);
          if (gitHead) {
            await this.sessionInfoService.updateSessionInfo(systemInit.session_id, {
              initial_commit_head: gitHead
            });
          }
        }
      } catch (error) {
        this.logger.warn("Failed to set initial commit head", { error });
      }
    }
    this.logger.info("Conversation started", {
      streamingId,
      sessionId: systemInit.session_id,
      model: systemInit.model
    });
    return { streamingId, systemInit };
  }
  /**
   * Execute the SDK query in background
   */
  async executeQuery(streamingId, config, workingDirectory, signal) {
    const abortController = new AbortController();
    signal.addEventListener("abort", () => abortController.abort());
    try {
      const response = query({
        prompt: config.initialPrompt,
        options: {
          model: config.model || "claude-sonnet-4-5",
          cwd: workingDirectory,
          systemPrompt: config.systemPrompt,
          permissionMode: config.permissionMode || "default",
          resume: config.resumedSessionId,
          tools: config.allowedTools,
          disallowedTools: config.disallowedTools,
          canUseTool: this.createPermissionHandler(streamingId),
          abortController
        }
      });
      for await (const message of response) {
        if (signal.aborted) break;
        const streamEvent = this.mapToStreamEvent(streamingId, message);
        if (streamEvent) {
          this.emit("claude-message", { streamingId, message: streamEvent });
        }
        if (message.type === "result") {
          break;
        }
      }
      this.emit("process-closed", { streamingId, code: 0 });
    } catch (error) {
      if (signal.aborted) {
        this.emit("process-closed", { streamingId, code: 0 });
      } else {
        this.logger.error("Query execution error", error);
        this.emit("process-error", { streamingId, error: String(error) });
        this.emit("process-closed", { streamingId, code: 1 });
      }
    } finally {
      this.cleanup(streamingId);
    }
  }
  /**
   * Create permission handler for canUseTool callback
   */
  createPermissionHandler(streamingId) {
    return async (toolName, input, _options) => {
      if (READ_ONLY_TOOLS.includes(toolName)) {
        return { behavior: "allow", updatedInput: input };
      }
      this.logger.debug("Permission requested", { streamingId, toolName });
      const request = this.permissionTracker.addPermissionRequest(toolName, input, streamingId);
      try {
        const decision = await this.waitForPermissionDecision(request.id, 60 * 60 * 1e3);
        if (decision.status === "approved") {
          return {
            behavior: "allow",
            updatedInput: decision.modifiedInput || input
          };
        } else {
          return {
            behavior: "deny",
            message: decision.denyReason || "Permission denied by user"
          };
        }
      } catch (_error) {
        this.logger.warn("Permission request timed out", { toolName, requestId: request.id });
        return {
          behavior: "deny",
          message: "Permission request timed out"
        };
      }
    };
  }
  /**
   * Wait for a permission decision from the user
   */
  waitForPermissionDecision(requestId, timeout) {
    return new Promise((resolve, reject) => {
      const request = this.permissionTracker.getPermissionRequest(requestId);
      if (request && request.status !== "pending") {
        resolve({
          status: request.status,
          modifiedInput: request.modifiedInput,
          denyReason: request.denyReason
        });
        return;
      }
      this.permissionPromises.set(requestId, { resolve, reject });
      setTimeout(() => {
        if (this.permissionPromises.has(requestId)) {
          this.permissionPromises.delete(requestId);
          reject(new Error("Permission request timed out"));
        }
      }, timeout);
    });
  }
  /**
   * Map SDK messages to StreamEvent types
   */
  mapToStreamEvent(streamingId, message) {
    const sessionId = this.sessionMap.get(streamingId) || "";
    switch (message.type) {
      case "system":
        if (message.subtype === "init") {
          return {
            type: "system",
            subtype: "init",
            session_id: message.session_id || sessionId,
            cwd: message.cwd || "",
            tools: message.tools || [],
            mcp_servers: message.mcp_servers || [],
            model: message.model || "unknown",
            permissionMode: message.permissionMode || "default",
            apiKeySource: message.apiKeySource || "unknown"
          };
        }
        return null;
      case "result":
        return {
          type: "result",
          subtype: message.subtype,
          session_id: message.session_id || sessionId,
          is_error: message.is_error,
          duration_ms: message.duration_ms || 0,
          duration_api_ms: message.duration_api_ms || 0,
          num_turns: message.num_turns || 0,
          result: "result" in message ? message.result : void 0,
          usage: message.usage ? {
            input_tokens: message.usage.input_tokens || 0,
            cache_creation_input_tokens: message.usage.cache_creation_input_tokens || 0,
            cache_read_input_tokens: message.usage.cache_read_input_tokens || 0,
            output_tokens: message.usage.output_tokens || 0,
            server_tool_use: { web_search_requests: message.usage.server_tool_use?.web_search_requests || 0 }
          } : {
            input_tokens: 0,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
            output_tokens: 0,
            server_tool_use: { web_search_requests: 0 }
          }
        };
      case "assistant":
        return {
          type: "assistant",
          session_id: message.session_id || sessionId,
          message: message.message,
          parent_tool_use_id: message.parent_tool_use_id || void 0
        };
      case "user":
        return {
          type: "user",
          session_id: message.session_id || sessionId,
          message: message.message,
          parent_tool_use_id: message.parent_tool_use_id || void 0
        };
      case "stream_event":
        return null;
      case "tool_progress":
        this.logger.debug("Tool progress", { toolName: message.tool_name, streamingId });
        return null;
      case "auth_status":
        return null;
      default:
        this.logger.debug("Unknown message type", { type: message.type, streamingId });
        return null;
    }
  }
  /**
   * Stop a conversation
   */
  async stopConversation(streamingId) {
    const controller = this.activeQueries.get(streamingId);
    if (!controller) {
      this.logger.warn("No active query for streamingId", { streamingId });
      return false;
    }
    controller.abort();
    this.cleanup(streamingId);
    this.logger.info("Conversation stopped", { streamingId });
    return true;
  }
  /**
   * Cleanup resources for a conversation
   */
  cleanup(streamingId) {
    this.activeQueries.delete(streamingId);
    this.sessionMap.delete(streamingId);
    for (const [requestId, promise] of this.permissionPromises.entries()) {
      const request = this.permissionTracker.getPermissionRequest(requestId);
      if (request?.streamingId === streamingId) {
        promise.reject(new Error("Conversation ended"));
        this.permissionPromises.delete(requestId);
      }
    }
  }
  /**
   * Get active sessions
   */
  getActiveSessions() {
    return Array.from(this.activeQueries.keys());
  }
  /**
   * Check if a session is active
   */
  isSessionActive(streamingId) {
    return this.activeQueries.has(streamingId);
  }
}
class StreamManager extends EventEmitter {
  clients = /* @__PURE__ */ new Map();
  logger;
  heartbeatInterval;
  encoder = new TextEncoder();
  HEARTBEAT_INTERVAL_MS = 3e4;
  constructor() {
    super();
    this.logger = createLogger("StreamManager");
  }
  /**
   * Create a ReadableStream for SSE that subscribes to this streaming session
   */
  createStream(streamingId) {
    this.logger.debug("Creating stream for client", { streamingId });
    return new ReadableStream({
      start: (controller) => {
        this.addClient(streamingId, controller);
      },
      cancel: () => {
        this.logger.debug("Stream cancelled by client", { streamingId });
      }
    });
  }
  /**
   * Add a stream controller to receive updates
   */
  addClient(streamingId, controller) {
    if (!this.clients.has(streamingId)) {
      this.clients.set(streamingId, /* @__PURE__ */ new Set());
    }
    this.clients.get(streamingId).add(controller);
    this.logger.debug("Client added successfully", {
      streamingId,
      totalClients: this.clients.get(streamingId).size
    });
    const connectionMessage = {
      type: "connected",
      streaming_id: streamingId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.sendSSEEvent(controller, connectionMessage);
    this.startHeartbeat();
  }
  /**
   * Remove a client connection
   */
  removeClient(streamingId, controller) {
    const clients = this.clients.get(streamingId);
    if (clients) {
      clients.delete(controller);
      if (clients.size === 0) {
        this.clients.delete(streamingId);
      }
    }
    this.emit("client-disconnected", { streamingId });
    if (this.getTotalClientCount() === 0) {
      this.stopHeartbeat();
    }
  }
  /**
   * Broadcast an event to all clients watching a session
   */
  broadcast(streamingId, event) {
    this.logger.debug("Broadcasting event to clients", {
      streamingId,
      eventType: event?.type
    });
    const clients = this.clients.get(streamingId);
    if (!clients || clients.size === 0) {
      this.logger.debug("No clients found for streaming session", { streamingId });
      return;
    }
    const deadClients = [];
    for (const client of clients) {
      try {
        this.sendSSEEvent(client, event);
      } catch {
        deadClients.push(client);
      }
    }
    deadClients.forEach((client) => this.removeClient(streamingId, client));
  }
  /**
   * Send an SSE event to a specific client
   */
  sendSSEEvent(controller, message) {
    const sseData = `data: ${JSON.stringify(message)}

`;
    controller.enqueue(this.encoder.encode(sseData));
  }
  /**
   * Send SSE heartbeat comment to keep connection alive
   */
  sendHeartbeat(controller) {
    try {
      controller.enqueue(this.encoder.encode(": heartbeat\n\n"));
    } catch {
    }
  }
  /**
   * Get number of clients connected to a session
   */
  getClientCount(streamingId) {
    return this.clients.get(streamingId)?.size || 0;
  }
  /**
   * Get all active sessions
   */
  getActiveSessions() {
    return Array.from(this.clients.keys());
  }
  /**
   * Close all connections for a session
   */
  closeSession(streamingId) {
    const clients = this.clients.get(streamingId);
    if (!clients) return;
    const closeEvent = {
      type: "closed",
      streamingId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    for (const client of Array.from(clients)) {
      try {
        this.sendSSEEvent(client, closeEvent);
        client.close();
      } catch {
      }
    }
    this.clients.delete(streamingId);
    if (this.getTotalClientCount() === 0) {
      this.stopHeartbeat();
    }
  }
  /**
   * Get total number of clients across all sessions
   */
  getTotalClientCount() {
    let total = 0;
    for (const clients of this.clients.values()) {
      total += clients.size;
    }
    return total;
  }
  /**
   * Disconnect all clients from all sessions
   */
  disconnectAll() {
    for (const streamingId of this.clients.keys()) {
      this.closeSession(streamingId);
    }
    this.stopHeartbeat();
  }
  /**
   * Start periodic heartbeat to keep SSE connections alive
   */
  startHeartbeat() {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      for (const clients of this.clients.values()) {
        for (const client of clients) {
          this.sendHeartbeat(client);
        }
      }
    }, this.HEARTBEAT_INTERVAL_MS);
  }
  /**
   * Stop periodic heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = void 0;
    }
  }
}
class WorkingDirectoriesService {
  constructor(historyReader2, logger2) {
    this.historyReader = historyReader2;
    this.logger = logger2.child({ component: "WorkingDirectoriesService" });
  }
  logger;
  async getWorkingDirectories() {
    try {
      const { conversations } = await this.historyReader.listConversations();
      const directoryMap = /* @__PURE__ */ new Map();
      for (const conversation of conversations) {
        const path2 = conversation.projectPath;
        if (!path2) continue;
        const existing = directoryMap.get(path2);
        const conversationDate = new Date(conversation.updatedAt);
        if (!existing || conversationDate > existing.lastDate) {
          directoryMap.set(path2, {
            lastDate: conversationDate,
            count: (existing?.count || 0) + 1
          });
        } else {
          existing.count++;
        }
      }
      const paths = Array.from(directoryMap.keys());
      const shortnames = this.computeShortnames(paths);
      const directories = [];
      for (const [path2, metadata] of directoryMap.entries()) {
        directories.push({
          path: path2,
          shortname: shortnames.get(path2) || path2.split("/").pop() || path2,
          lastDate: metadata.lastDate.toISOString().replace(/\.\d{3}Z$/, "Z"),
          // Remove milliseconds for consistency
          conversationCount: metadata.count
        });
      }
      directories.sort(
        (a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime()
      );
      this.logger.debug("Retrieved working directories", {
        totalDirectories: directories.length
      });
      return {
        directories,
        totalCount: directories.length
      };
    } catch (error) {
      this.logger.error("Failed to get working directories", error);
      throw error;
    }
  }
  /**
   * Compute shortest unique suffixes for a list of paths
   * 
   * Examples:
   * - ["/home/alice/project", "/home/bob/project"] -> ["alice/project", "bob/project"]
   * - ["/home/user/web", "/home/user/api"] -> ["web", "api"]
   * - ["/single/path"] -> ["path"]
   */
  computeShortnames(paths) {
    const result = /* @__PURE__ */ new Map();
    if (paths.length === 0) return result;
    if (paths.length === 1) {
      const segments = paths[0].split("/").filter((s) => s);
      result.set(paths[0], segments[segments.length - 1] || paths[0]);
      return result;
    }
    const pathSegments = paths.map((path2) => ({
      path: path2,
      segments: path2.split("/").filter((s) => s)
    }));
    for (const { path: path2, segments } of pathSegments) {
      let suffixLength = 1;
      let shortname = "";
      while (suffixLength <= segments.length) {
        const suffix = segments.slice(-suffixLength).join("/");
        const isUnique = pathSegments.every(
          (other) => other.path === path2 || other.segments.slice(-suffixLength).join("/") !== suffix
        );
        if (isUnique) {
          shortname = suffix;
          break;
        }
        suffixLength++;
      }
      result.set(path2, shortname || path2);
    }
    return result;
  }
}
const logger = createLogger("ServiceRegistry");
let sessionInfoService;
let historyReader;
let conversationStatusManager;
let toolMetricsService;
let fileSystemService;
let permissionTracker;
let agentService;
let streamManager;
let workingDirectoriesService;
let notificationService;
let webPushService;
let initialized = false;
async function initializeServices() {
  if (initialized) return;
  logger.debug("Initializing services");
  await ConfigService.getInstance().initialize();
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
  agentService.setNotificationService(notificationService);
  agentService.setConversationStatusManager(conversationStatusManager);
  permissionTracker.setNotificationService(notificationService);
  permissionTracker.setConversationStatusManager(conversationStatusManager);
  permissionTracker.setHistoryReader(historyReader);
  agentService.on("stream-event", (streamingId, event) => {
    streamManager.broadcast(streamingId, event);
  });
  initialized = true;
  logger.debug("Services initialized successfully");
}
function getServices() {
  if (!initialized) {
    throw new Error("Services not initialized. Call initializeServices() first.");
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
export {
  getServices as g,
  initializeServices as i
};
