import fs from "fs";
import path__default from "path";
import os__default from "os";
import crypto from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
import pino from "pino";
import { Transform, PassThrough } from "stream";
import { EventEmitter } from "events";
import "@anthropic-ai/sdk";
const DEFAULT_CONFIG = {
  server: {
    host: "localhost",
    port: 3001
  },
  interface: {
    colorScheme: "system",
    language: "en"
  }
};
const execAsync = promisify(exec);
async function getPrimaryMacAddress() {
  try {
    let command;
    const platform = os__default.platform();
    if (platform === "darwin") {
      command = "ifconfig en0 | grep ether | awk '{print $2}'";
    } else if (platform === "linux") {
      command = `ip link show | grep -E "eno1|eth0|enp0s[0-9]+" -A1 | grep link/ether | head -1 | awk '{print $2}'`;
    } else if (platform === "win32") {
      command = 'wmic nic where "PhysicalAdapter=TRUE" get MACAddress | findstr /r "[0-9A-F][0-9A-F]:[0-9A-F][0-9A-F]" | head -1';
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    const { stdout } = await execAsync(command);
    const mac = stdout.trim();
    if (!mac) {
      throw new Error("No MAC address found");
    }
    return mac;
  } catch (_error) {
    const interfaces = os__default.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name];
      if (!iface) continue;
      for (const info of iface) {
        if (!info.internal && info.mac && info.mac !== "00:00:00:00:00:00") {
          return info.mac;
        }
      }
    }
    throw new Error("Unable to determine MAC address");
  }
}
async function generateMachineId() {
  const hostname = os__default.hostname().toLowerCase().replace(/[^a-z0-9-]/g, "");
  const macAddress = await getPrimaryMacAddress();
  const hash = crypto.createHash("sha256").update(macAddress.toLowerCase()).digest("hex").substring(0, 16);
  return `${hostname}-${hash}`;
}
const RESET = "\x1B[0m";
const GRAY = "\x1B[90m";
const BOLD = "\x1B[1m";
const BLUE = "\x1B[34m";
class LogFormatter extends Transform {
  constructor() {
    super({
      writableObjectMode: true,
      transform(chunk, _encoding, callback) {
        try {
          const logLine = String(chunk).trim();
          if (!logLine) {
            callback();
            return;
          }
          const log = JSON.parse(logLine);
          const formatted = formatLog(log);
          callback(null, formatted + "\n");
        } catch (_err) {
          callback(null, chunk);
        }
      }
    });
  }
}
function formatLog(log) {
  const time = new Date(typeof log.time === "string" ? log.time : log.time);
  const hours = time.getHours();
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = (hours % 12 || 12).toString().padStart(2, "0");
  const timestamp = `${displayHours}:${minutes}:${seconds} ${ampm}`;
  let formatted = `${GRAY}${timestamp}${RESET}`;
  if (log.component) {
    formatted += ` ${BOLD}${BLUE}[${log.component}]${RESET}`;
  }
  formatted += ` ${log.msg}`;
  const excludedFields = ["level", "time", "msg", "component", "pid", "hostname", "v"];
  const contextFields = Object.keys(log).filter((key) => !excludedFields.includes(key) && log[key] !== void 0 && log[key] !== null);
  if (contextFields.length > 0) {
    const contextPairs = contextFields.map((key) => {
      const value = log[key];
      if ((key === "err" || key === "error") && typeof value === "object" && value !== null && "message" in value) {
        return `${key}="${value.message}"`;
      }
      if (typeof value === "string") {
        return `${key}="${value}"`;
      } else if (typeof value === "number" || typeof value === "boolean") {
        return `${key}=${value}`;
      } else {
        return `${key}=${JSON.stringify(value)}`;
      }
    });
    formatted += ` ${GRAY}${contextPairs.join(" ")}${RESET}`;
  }
  if (log.err && typeof log.err === "object" && "stack" in log.err && log.err.stack) {
    formatted += `
${log.err.stack}`;
  }
  return formatted;
}
class CUILogger {
  constructor(pinoLogger) {
    this.pinoLogger = pinoLogger;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug(message, context) {
    if (context !== void 0) {
      this.pinoLogger.debug(context, message);
    } else {
      this.pinoLogger.debug(message);
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info(message, context) {
    if (context !== void 0) {
      this.pinoLogger.info(context, message);
    } else {
      this.pinoLogger.info(message);
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn(message, context) {
    if (context !== void 0) {
      this.pinoLogger.warn(context, message);
    } else {
      this.pinoLogger.warn(message);
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error(message, error, context) {
    if (error instanceof Error) {
      const logData = { err: error, ...context };
      this.pinoLogger.error(logData, message);
    } else if (error !== void 0 && context !== void 0) {
      const logData = { ...error, ...context };
      this.pinoLogger.error(logData, message);
    } else if (error !== void 0) {
      this.pinoLogger.error(error, message);
    } else {
      this.pinoLogger.error(message);
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fatal(message, error, context) {
    if (error instanceof Error) {
      const logData = { err: error, ...context };
      this.pinoLogger.fatal(logData, message);
    } else if (error !== void 0 && context !== void 0) {
      const logData = { ...error, ...context };
      this.pinoLogger.fatal(logData, message);
    } else if (error !== void 0) {
      this.pinoLogger.fatal(error, message);
    } else {
      this.pinoLogger.fatal(message);
    }
  }
  // Support for creating child loggers
  child(context) {
    return new CUILogger(this.pinoLogger.child(context));
  }
}
class LoggerService {
  static instance;
  baseLogger;
  logInterceptStream;
  childLoggers = /* @__PURE__ */ new Map();
  constructor() {
    const logLevel = (process.env.LOG_LEVEL || "info").toLowerCase();
    this.logInterceptStream = new PassThrough();
    this.logInterceptStream.on("data", (chunk) => {
      const logLine = chunk.toString().trim();
      if (logLine) {
        import("./log-stream-buffer.js").then(({ logStreamBuffer }) => {
          logStreamBuffer.addLog(logLine);
        }).catch(() => {
        });
      }
    });
    const formatter = new LogFormatter();
    formatter.pipe(process.stdout);
    const streams = [
      { level: logLevel, stream: formatter },
      { level: logLevel, stream: this.logInterceptStream }
    ];
    this.baseLogger = pino({
      level: logLevel,
      formatters: {
        level: (label) => {
          return { level: label };
        }
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      // Enable in test environment if debug level, otherwise suppress
      enabled: process.env.NODE_ENV !== "test" || logLevel === "debug"
    }, pino.multistream(streams));
  }
  /**
   * Get the singleton logger instance
   */
  static getInstance() {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }
  /**
   * Create a child logger with context
   */
  child(context) {
    const contextKey = JSON.stringify(context);
    if (!this.childLoggers.has(contextKey)) {
      this.childLoggers.set(contextKey, this.baseLogger.child(context));
    }
    return new CUILogger(this.childLoggers.get(contextKey));
  }
  /**
   * Get the base logger
   */
  getLogger() {
    return new CUILogger(this.baseLogger);
  }
  /**
   * Log debug message
   */
  debug(message, context) {
    if (context) {
      this.baseLogger.child(context).debug(message);
    } else {
      this.baseLogger.debug(message);
    }
  }
  /**
   * Log info message
   */
  info(message, context) {
    if (context) {
      this.baseLogger.child(context).info(message);
    } else {
      this.baseLogger.info(message);
    }
  }
  /**
   * Log warning message
   */
  warn(message, context) {
    if (context) {
      this.baseLogger.child(context).warn(message);
    } else {
      this.baseLogger.warn(message);
    }
  }
  /**
   * Log error message
   */
  error(message, error, context) {
    const logData = error ? { err: error } : {};
    if (context) {
      this.baseLogger.child({ ...context, ...logData }).error(message);
    } else {
      this.baseLogger.error(logData, message);
    }
  }
  /**
   * Log fatal message
   */
  fatal(message, error, context) {
    const logData = error ? { err: error } : {};
    if (context) {
      this.baseLogger.child({ ...context, ...logData }).fatal(message);
    } else {
      this.baseLogger.fatal(logData, message);
    }
  }
}
const logger = LoggerService.getInstance();
function createLogger(component, baseContext) {
  const context = { component, ...baseContext };
  return logger.child(context);
}
class ConfigService {
  static instance;
  config = null;
  logger;
  configPath;
  configDir;
  emitter = new EventEmitter();
  watcher;
  debounceTimer;
  lastLoadedRaw;
  pollInterval;
  constructor() {
    this.logger = createLogger("ConfigService");
    this.configDir = path__default.join(os__default.homedir(), ".cui");
    this.configPath = path__default.join(this.configDir, "config.json");
  }
  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }
  /**
   * Initialize configuration
   * Creates config file if it doesn't exist
   * Throws error if initialization fails
   */
  async initialize() {
    this.logger.info("Initializing configuration", { configPath: this.configPath });
    try {
      if (!fs.existsSync(this.configPath)) {
        await this.createDefaultConfig();
      }
      await this.loadConfig();
      this.startWatching();
    } catch (error) {
      this.logger.error("Failed to initialize configuration", error);
      throw new Error(`Configuration initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * Get current configuration
   * Throws if not initialized
   */
  getConfig() {
    if (!this.config) {
      throw new Error("Configuration not initialized. Call initialize() first.");
    }
    return this.config;
  }
  /**
   * Create default configuration
   */
  async createDefaultConfig() {
    this.logger.info("Creating default configuration");
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
        this.logger.debug("Created config directory", { dir: this.configDir });
      }
      const machineId = await generateMachineId();
      this.logger.debug("Generated machine ID", { machineId });
      const authToken = crypto.randomBytes(16).toString("hex");
      this.logger.debug("Generated auth token", { tokenLength: authToken.length });
      const config = {
        machine_id: machineId,
        authToken,
        ...DEFAULT_CONFIG
      };
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(config, null, 2),
        "utf-8"
      );
      this.logger.info("Default configuration created", {
        path: this.configPath,
        machineId: config.machine_id
      });
    } catch (error) {
      throw new Error(`Failed to create default config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * Load configuration from file
   */
  async loadConfig() {
    try {
      const configData = fs.readFileSync(this.configPath, "utf-8");
      let fileConfig;
      try {
        fileConfig = JSON.parse(configData);
      } catch (_parseError) {
        throw new Error("Invalid JSON in configuration file");
      }
      this.validateProvidedFields(fileConfig);
      let updated = false;
      const merged = {
        // Start with defaults
        ...DEFAULT_CONFIG,
        // Bring over everything from file (including optional fields like router, gemini)
        ...fileConfig,
        // Ensure required identifiers are set from file
        machine_id: fileConfig.machine_id || await generateMachineId(),
        authToken: fileConfig.authToken || crypto.randomBytes(16).toString("hex"),
        // Deep-merge known nested sections to ensure defaults are filled without dropping user values
        server: { ...DEFAULT_CONFIG.server, ...fileConfig.server || {} },
        interface: { ...DEFAULT_CONFIG.interface, ...fileConfig.interface || {} }
      };
      if (!fileConfig.server || JSON.stringify(merged.server) !== JSON.stringify(fileConfig.server)) updated = true;
      if (!fileConfig.interface || JSON.stringify(merged.interface) !== JSON.stringify(fileConfig.interface)) updated = true;
      if (!fileConfig.machine_id) updated = true;
      if (!fileConfig.authToken) updated = true;
      this.validateCompleteConfig(merged);
      this.config = merged;
      this.lastLoadedRaw = JSON.stringify(this.config, null, 2);
      if (updated) {
        fs.writeFileSync(this.configPath, this.lastLoadedRaw, "utf-8");
        this.logger.info("Configuration updated with defaults");
      }
      this.logger.debug("Configuration loaded successfully");
    } catch (error) {
      throw new Error(`Failed to load config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * Update configuration
   */
  async updateConfig(updates) {
    if (!this.config) {
      throw new Error("Configuration not initialized");
    }
    this.logger.info("Updating configuration", { updates });
    const current = this.config;
    const mergedServer = updates.server ? { ...current.server, ...updates.server } : current.server;
    const mergedInterface = updates.interface ? {
      ...current.interface,
      ...updates.interface,
      // Deep-merge nested notifications object if provided
      notifications: updates.interface.notifications !== void 0 ? { ...current.interface.notifications || {}, ...updates.interface.notifications } : current.interface.notifications
    } : current.interface;
    const mergedRouter = updates.router ? { ...current.router || {}, ...updates.router } : current.router;
    const mergedGemini = updates.gemini ? { ...current.gemini || {}, ...updates.gemini } : current.gemini;
    const newConfig = {
      ...current,
      server: mergedServer,
      interface: mergedInterface,
      gemini: mergedGemini,
      router: mergedRouter
    };
    const prev = this.config;
    this.config = newConfig;
    try {
      this.lastLoadedRaw = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(this.configPath, this.lastLoadedRaw, "utf-8");
      this.logger.info("Configuration updated successfully");
      this.emitter.emit("config-changed", this.config, prev, "internal");
    } catch (error) {
      this.logger.error("Failed to update configuration", error);
      throw new Error(`Failed to update config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * Subscribe to configuration changes
   */
  onChange(listener) {
    this.emitter.on("config-changed", listener);
  }
  /**
   * Validate provided fields in a partial config. Throws on incompatible values.
   */
  validateProvidedFields(partial) {
    if (partial.server) {
      this.assertServerConfig(partial.server);
    }
    if (partial.interface) {
      this.assertInterfaceConfig(partial.interface);
    }
    if (partial.router) {
      this.assertRouterConfig(partial.router);
    }
    if (partial.gemini) {
      if (partial.gemini.apiKey !== void 0 && typeof partial.gemini.apiKey !== "string") {
        throw new Error("Invalid config: gemini.apiKey must be a string");
      }
      if (partial.gemini.model !== void 0 && typeof partial.gemini.model !== "string") {
        throw new Error("Invalid config: gemini.model must be a string");
      }
    }
    if (partial.machine_id !== void 0 && typeof partial.machine_id !== "string") {
      throw new Error("Invalid config: machine_id must be a string");
    }
    if (partial.authToken !== void 0 && typeof partial.authToken !== "string") {
      throw new Error("Invalid config: authToken must be a string");
    }
  }
  /**
   * Validate a complete merged config before using it. Throws on error.
   */
  validateCompleteConfig(config) {
    if (!config.machine_id || typeof config.machine_id !== "string") {
      throw new Error("Invalid config: missing machine_id");
    }
    this.assertServerConfig(config.server);
    if (!config.authToken || typeof config.authToken !== "string") {
      throw new Error("Invalid config: missing authToken");
    }
    if (config.interface) {
      this.assertInterfaceConfig(config.interface);
    }
    if (config.router) {
      this.assertRouterConfig(config.router);
    }
  }
  assertServerConfig(server) {
    if (server.host !== void 0 && typeof server.host !== "string") {
      throw new Error("Invalid config: server.host must be a string");
    }
    if (server.port !== void 0 && typeof server.port !== "number") {
      throw new Error("Invalid config: server.port must be a number");
    }
  }
  assertInterfaceConfig(iface) {
    if (iface.colorScheme !== void 0 && !["light", "dark", "system"].includes(iface.colorScheme)) {
      throw new Error("Invalid config: interface.colorScheme must be 'light' | 'dark' | 'system'");
    }
    if (iface.language !== void 0 && typeof iface.language !== "string") {
      throw new Error("Invalid config: interface.language must be a string");
    }
    if (iface.notifications !== void 0) {
      const n = iface.notifications;
      if (n && typeof n.enabled !== "boolean") {
        throw new Error("Invalid config: interface.notifications.enabled must be a boolean");
      }
      if (n && n.ntfyUrl !== void 0 && typeof n.ntfyUrl !== "string") {
        throw new Error("Invalid config: interface.notifications.ntfyUrl must be a string");
      }
    }
  }
  assertRouterConfig(router) {
    if (router.enabled !== void 0 && typeof router.enabled !== "boolean") {
      throw new Error("Invalid config: router.enabled must be a boolean");
    }
    if (router.providers !== void 0) {
      if (!Array.isArray(router.providers)) {
        throw new Error("Invalid config: router.providers must be an array");
      }
      for (const p of router.providers) {
        if (p.name !== void 0 && typeof p.name !== "string") throw new Error("Invalid config: router.providers[].name must be a string");
        if (p.api_base_url !== void 0 && typeof p.api_base_url !== "string") throw new Error("Invalid config: router.providers[].api_base_url must be a string");
        if (p.api_key !== void 0 && typeof p.api_key !== "string") throw new Error("Invalid config: router.providers[].api_key must be a string");
        if (p.models !== void 0 && !Array.isArray(p.models)) throw new Error("Invalid config: router.providers[].models must be an array of strings");
        if (Array.isArray(p.models)) {
          for (const m of p.models) {
            if (typeof m !== "string") throw new Error("Invalid config: router.providers[].models must contain strings");
          }
        }
      }
    }
    if (router.rules !== void 0) {
      if (typeof router.rules !== "object" || router.rules === null || Array.isArray(router.rules)) {
        throw new Error("Invalid config: router.rules must be an object of string values");
      }
      for (const [k, v] of Object.entries(router.rules)) {
        if (typeof v !== "string") throw new Error(`Invalid config: router.rules['${k}'] must be a string`);
      }
    }
  }
  startWatching() {
    if (this.watcher) return;
    try {
      this.emitter.setMaxListeners(0);
      if (process.env.NODE_ENV === "test") {
        this.pollInterval = setInterval(() => {
          try {
            const raw = fs.readFileSync(this.configPath, "utf-8");
            if (!this.lastLoadedRaw || raw !== this.lastLoadedRaw) {
              if (this.debounceTimer) clearTimeout(this.debounceTimer);
              this.debounceTimer = setTimeout(() => this.handleExternalChange(), 10);
            }
          } catch {
          }
        }, 50);
        this.logger.debug("Started interval polling for configuration changes (test mode)");
      } else {
        this.watcher = fs.watch(this.configPath, { persistent: false }, (eventType) => {
          if (eventType !== "change" && eventType !== "rename") return;
          if (this.debounceTimer) clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => this.handleExternalChange(), 250);
        });
        this.logger.debug("Started watching configuration file for changes");
      }
    } catch (error) {
      this.logger.warn("Failed to start file watcher for configuration", error);
    }
  }
  handleExternalChange() {
    try {
      const newRaw = fs.readFileSync(this.configPath, "utf-8");
      if (this.lastLoadedRaw && newRaw === this.lastLoadedRaw) {
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(newRaw);
      } catch (_e) {
        this.logger.error("Ignoring external config change due to invalid JSON");
        return;
      }
      this.validateProvidedFields(parsed);
      const current = this.config || { ...DEFAULT_CONFIG, machine_id: "", authToken: "" };
      const merged = {
        ...DEFAULT_CONFIG,
        ...current,
        ...parsed,
        server: { ...DEFAULT_CONFIG.server, ...current.server || {}, ...parsed.server || {} },
        interface: { ...DEFAULT_CONFIG.interface, ...current.interface || {}, ...parsed.interface || {} },
        router: parsed.router !== void 0 ? parsed.router : current.router,
        gemini: parsed.gemini !== void 0 ? parsed.gemini : current.gemini,
        machine_id: parsed.machine_id || current.machine_id,
        authToken: parsed.authToken || current.authToken
      };
      this.validateCompleteConfig(merged);
      const prev = this.config;
      this.config = merged;
      this.lastLoadedRaw = JSON.stringify(merged, null, 2);
      this.logger.info("Configuration reloaded from external change");
      this.emitter.emit("config-changed", this.config, prev || null, "external");
    } catch (error) {
      this.logger.error("Failed to handle external configuration change", error);
    }
  }
  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance() {
    ConfigService.instance = null;
  }
}
class CUIError extends Error {
  constructor(code, message, statusCode = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = "CUIError";
  }
}
export {
  CUIError as C,
  ConfigService as a,
  createLogger as c,
  logger as l
};
