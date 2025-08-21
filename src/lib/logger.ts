export type LogLevel = 'info' | 'warn' | 'error';

export function log(level: LogLevel, message: string, data: Record<string, unknown> = {}) {
  const entry = { ts: new Date().toISOString(), level, message, ...data };
  const line = `[${level.toUpperCase()}] ${message} — ${JSON.stringify(data)}`;
  if (level === 'error') console.error(line); else if (level === 'warn') console.warn(line); else console.log(line);
  return entry;
}
