import { Request, Response } from 'express';
import { lstat } from 'fs/promises';

export function noCache(res: Response): void {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
}

export function jsonOrJsonp(req: Request, res: Response, data: any): void {
  if (req.query.callback)
    res.jsonp(data);
  else
    res.json(data);
}

/**
 * Normalize a port into a number, string, or false.
 */
export function normalizePort(val: number | string): string | number | false {
  const port = parseInt(val as string, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

export function splitIpAndPort(ipWithPossiblePort: string, defaultPort?: number): [string, number] {
  if (!ipWithPossiblePort)
    return [undefined, defaultPort];

  let $ = /^\[(.+)]:(\d+)$/.exec(ipWithPossiblePort); // IPv6 with port

  if ($)
    return [$[1], Number($[2])];

  $ = /^([^[:]+):(\d+)$/.exec(ipWithPossiblePort); // domain or IPv4 with port

  if ($)
    return [$[1], Number($[2])];

  return [ipWithPossiblePort, defaultPort];
}

export function getRemoteAddress(req: Request): string {
  return (req.headers['x-real-ip'] as string) || req.connection.remoteAddress;
}

const charsNeedingRegexEscape = /[-[\]/{}()*+?.\\^$|]/g;

export function escapeForRegex(s: string): string {
  return s.replace(charsNeedingRegexEscape, '\\$&');
}

export function timeStamp(): string {
  return '[' + new Date().toISOString() + ']';
}

export function unref(timer: any): any {
  if (timer?.unref)
    timer.unref();

  return timer;
}

export function filterError(error: any): string {
  error = error?.message ?? error?.toString();

  return error && error.replace(/^\s*Error:\s*/i, '');
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
  }
  catch {
    return false;
  }

  return true;
}
