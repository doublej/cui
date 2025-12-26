import { EventEmitter } from "events";
class LogStreamBuffer extends EventEmitter {
  buffer = [];
  maxBufferSize;
  constructor(maxBufferSize = 1e3) {
    super();
    this.maxBufferSize = maxBufferSize;
  }
  addLog(logLine) {
    this.buffer.push(logLine);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
    this.emit("log", logLine);
  }
  getRecentLogs(limit) {
    if (limit === 0) {
      return [];
    }
    if (limit === void 0 || limit === null || limit >= this.buffer.length) {
      return [...this.buffer];
    }
    return this.buffer.slice(-limit);
  }
  clear() {
    this.buffer = [];
  }
}
const logStreamBuffer = new LogStreamBuffer();
export {
  LogStreamBuffer,
  logStreamBuffer
};
