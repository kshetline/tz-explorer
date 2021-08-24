import archiver from 'archiver';
import fs, { ReadStream } from 'fs';
import fsp from 'fs/promises';
import needle from 'needle';
import path from 'path';
import { spawn } from 'child_process';
import tar from 'tar-stream';
import { tapStream } from './stream-tap';
import { parseAndUpdateReleaseNotes } from './db-access';

const baseUrl = 'https://data.iana.org/time-zones/releases/';

function adjustUrl(url: string): string {
  let origVersion = '';

  url = url.replace(/^(.*\/(?:tzdb-|tzcode|tzdata))([^.]+)(.*)$/, (_, $1, version, $3) => {
    origVersion = version;

    if (version < '1996l')
      version = version.substr(2);

    if (version === '93a')
      version = '93';

    return $1 + version + $3;
  });

  if (origVersion < '1993g' && url.endsWith('.gz'))
    url = url.replace(/\.gz$/, '.Z');

  url = url.replace('tzcode2006b', 'tz64code2006b');

  return url;
}

export async function codeAndDataToZip(version: string): Promise<ReadStream> {
  return compressedTarToZip(`${baseUrl}tzdb-${version}.tar.lz`);
}

export async function codeToZip(version: string): Promise<ReadStream> {
  return compressedTarToZip(`${baseUrl}tzcode${version}.tar.gz`);
}

export async function dataToZip(version: string): Promise<ReadStream> {
  return compressedTarToZip(`${baseUrl}tzdata${version}.tar.gz`);
}

async function compressedTarToZip(url: string): Promise<ReadStream> {
  const fileName = /([-a-z0-9]+)\.tar\.[lg]z$/i.exec(url)[1] + '.zip';
  const filePath = path.join(process.env.TZE_ZIP_DIR || path.join(__dirname, 'tz-zip-cache'), fileName);
  let stats: fs.Stats | false;
  let deferredError: any;
  let archiveError = (err: any): void => deferredError = deferredError ?? err;

  if ((stats = await fsp.stat(filePath).catch(() => false)) && stats.size > 1023)
    return fs.createReadStream(filePath);

  const [command, args] = url.endsWith('.lz') ? ['lzip', ['-d']] : ['gzip', ['-dc']];
  const originalArchive = needle.get((url = adjustUrl(url)), { headers: { 'User-Agent': 'curl/7.64.1' } },
    err => err && archiveError(err));
  const tarExtract = tar.extract({ allowUnknownFormat: true });
  const zipPack = archiver('zip');
  const writeFile = fs.createWriteStream(filePath);
  const commandProc = spawn(command, args);
  const entries = new Set<string>();

  originalArchive.pipe(commandProc.stdin);
  commandProc.stdout.pipe(tarExtract);

  tarExtract.on('entry', (header, stream, next) => {
    if (header.name.replace(/^.*\//, '') === 'NEWS') {
      stream = tapStream(stream, content => {
        parseAndUpdateReleaseNotes(content);
      });
    }

    // Skip duplicate entries - they are garbage data with bad streams.
    if (!entries.has(header.name)) {
      entries.add(header.name);
      zipPack.append(stream, { name: header.name, date: header.mtime });
    }

    stream.on('end', next);
  });

  tarExtract.on('finish', () => zipPack.finalize());
  zipPack.pipe(writeFile);

  return new Promise<ReadStream>((resolve, reject) => {
    const rejectWithError = (err: any): void =>
      reject(err instanceof Error ? err : new Error(err.message || err.toString()));
    let finishTimer: any;
    const finish = (): void => {
      if (finishTimer)
        clearTimeout(finishTimer);

      resolve(fs.createReadStream(filePath));
    };

    if (deferredError) {
      reject(deferredError);
      return;
    }

    archiveError = rejectWithError;
    commandProc.stderr.on('data', msg => rejectWithError(`${command} error: ${msg}`));
    commandProc.stderr.on('error', rejectWithError);
    writeFile.on('error', rejectWithError);
    writeFile.on('finish', finish);
    tarExtract.on('error', err => {
      // tar-stream has a problem with the format of a few of the tar files
      // dealt with here, which nevertheless are valid archives.
      if (/unexpected end of data|invalid tar header/i.test(err.message) && entries.size > 0) {
        if (!url.endsWith('.Z')) // Errors are expected on the old .Z files.
          console.error('Archive %s: %s', url, err.message);

        if (/unexpected end of data/i.test(err.message))
          finishTimer = setTimeout(() => tarExtract.emit('finish'), 500);
      }
      else
        reject(err);
    });
    zipPack.on('error', rejectWithError);
    zipPack.on('warning', rejectWithError);
    commandProc.on('error', rejectWithError);
    commandProc.on('exit', err => err && reject(new Error(`${command} error: ${err}`)));
    originalArchive.on('error', rejectWithError);
  });
}
