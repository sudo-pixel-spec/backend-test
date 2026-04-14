export interface RequestLogEntry {
  requestId: string | null;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  ip: string | null;
  userAgent: string | null;
  timestamp: string;
}

const MAX_ENTRIES = 500;
const buffer: RequestLogEntry[] = [];

export function appendRequestLog(entry: RequestLogEntry): void {
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) {
    buffer.shift();
  }
}

export function getRecentLogs(limit = 100): RequestLogEntry[] {
  return buffer.slice(-limit).reverse();
}