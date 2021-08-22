import { Pool, PoolConnection } from './my-sql-async';
import { isString } from '@tubular/util';

export const pool = new Pool({
  host: process.env.TZE_DB_HOST || '127.0.0.1',
  user: process.env.TZE_DB_ADMIN || 'admin',
  password: process.env.TZE_DB_PASSWORD,
  database: 'tzexplorer'
});

pool.on('connection', connection => {
  connection.query("SET NAMES 'utf8'").finally();
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
    else
      await connection.queryResults('REPLACE INTO properties (name, value) VALUES (?, ?)', [name, value]);

    return true;
  }
  catch (e) {
    console.error('setProperty: ', name, e.message || e.toString());
  }

  return false;
}

export async function getReleaseNote(connection: PoolConnection, version: string): Promise<string> {
  try {
    const results = await connection.queryResults('SELECT notes from release_notes WHERE version = ?', [version]);

    return results[0]?.notes;
  }
  catch (e) {
    console.error('getReleaseNotes: ', version, e.message || e.toString());
  }

  return undefined;
}

export async function setReleaseNote(connection: PoolConnection, version: string, notes: string): Promise<boolean> {
  try {
    if (notes === undefined)
      await connection.queryResults('DELETE FROM release_notes WHERE version = ?', [version]);
    else
      await connection.queryResults('REPLACE INTO release_notes (version, notes) VALUES (?, ?)', [version, notes]);

    return true;
  }
  catch (e) {
    console.error('setReleaseNotes: ', version, e.message || e.toString());
  }

  return false;
}

export async function parseAndUpdateReleaseNotes(news: string): Promise<void> {
  const notes = news.split(/(^Release \d\d\d\d[a-z][a-z]?.*?(?=\nRelease (?:\d\d\d\d[a-z][a-z]?|code)))/gms)
    .map(s => s.trim()).filter((s, index) => s && index % 3 === 1 && !/^Release code/.test(s));

  // Manually tack on two oldest release notes for available downloads.
  notes.push(
`Release 1996n - 1996-12-16 09:42:02 -0500

  link snapping fix from Bruce Evans (via Garrett Wollman)`,
`Release 1996l - 1996-09-08 17:12:20 -0400

  tzcode96k was missing a couple of pieces.

  No functional changes [to data] here; the files have simply been changed to
  make more use of ISO style dates in comments. The names of the above
  files now include the year in full.`);

  const connection = await pool.getConnection();

  try {
    const noteCount = (await connection.queryResults('SELECT COUNT(*) as count FROM release_notes'))[0]?.count ?? 0;

    if (noteCount < notes.length) {
      notes.forEach(note => {
        const version = /^Release (\d\d\d\d[a-z][a-z]?)/.exec(note)[1];

        setReleaseNote(connection, version, note);
      });
    }
  }
  finally {
    connection.release();
  }
}
