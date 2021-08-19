import { Pool, PoolConnection } from './my-sql-async';
import { isString } from '@tubular/util';

export const pool = new Pool({
  host: process.env.TZE_DB_HOST || '127.0.0.1',
  user: process.env.TZE_DB_ADMIN || 'admin',
  password: process.env.TZE_DB_PASSWORD,
  database: 'tzexplorer'
});

pool.on('connection', connection => {
  // noinspection JSIgnoredPromiseFromCall
  connection.query("SET NAMES 'utf8'");
});

export async function hasVersion(connection: PoolConnection, version: string): Promise<boolean> {
  const results = await connection.queryResults('SELECT created FROM zone_data WHERE version = ?', [version]);

  return !!results[0]?.created;
}

export async function saveVersion(connection: PoolConnection, version: string, json: string,
    small = null as string, large = null as string, largeAlt = null as string): Promise<boolean> {
  try {
    await connection.queryResults('INSERT INTO zone_data (version, json, small, large, large_alt) VALUES (?, ?, ?, ?, ?)',
      [version, json, small, large, largeAlt]);

    return true;
  }
  catch (e) {
    console.error('saveVersion: ', version, e.message || e.toString());
  }

  return false;
}

export async function getVersionData(connection: PoolConnection, version: string, format = 'json'): Promise<string> {
  try {
    const results = await connection.queryResults('SELECT ?? FROM zone_data WHERE version = ?', [format, version]);

    return results[0] && results[0][format];
  }
  catch (e) {
    console.error('saveVersion: ', version, e.message || e.toString());
  }

  return undefined;
}

export async function getDbProperty(connection: PoolConnection, name: string): Promise<string> {
  try {
    const results = await connection.queryResults('SELECT value from properties WHERE name = ?', [name]);

    return results[0]?.value;
  }
  catch (e) {
    console.error('getProperty: ', name, e.message || e.toString());
  }

  return undefined;
}

export async function setDbProperty(connection: PoolConnection, name: string, value: any): Promise<boolean> {
  if (value instanceof Date)
    value = value.toISOString();
  else if (value != null && !isString(value))
    value = value.toString();

  try {
    if (value === undefined)
      await connection.queryResults('DELETE FROM properties WHERE name = ?', [name]);
    else if ((await getDbProperty(connection, name)) === undefined)
      await connection.queryResults('INSERT INTO properties (name, value) VALUES (?, ?)', [name, value]);
    else
      await connection.queryResults('UPDATE properties SET value = ? WHERE name = ?', [value, name]);

    return true;
  }
  catch (e) {
    console.error('setProperty: ', name, e.message || e.toString());
  }

  return false;
}
