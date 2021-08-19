import archiver from 'archiver';
import fs, { ReadStream } from 'fs';
import fsp from 'fs/promises';
import needle from 'needle';
import path from 'path';
import { spawn } from 'child_process';
import tar from 'tar-stream';

const baseUrl = 'https://data.iana.org/time-zones/releases/';

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

  if (await fsp.stat(filePath).catch(() => false))
    return fs.createReadStream(filePath);

  const [command, args] = url.endsWith('.lz') ? ['lzip', ['-d']] : ['gzip', ['-dc']];
  const originalArchive = needle.get(url, { headers: { 'User-Agent': 'curl/7.64.1' } });
  const tarExtract = tar.extract({ allowUnknownFormat: true });
  const zipPack = archiver('zip');
  const writeFile = fs.createWriteStream(filePath);
  const commandProc = spawn(command, args);

  commandProc.stderr.on('data', msg => { throw new Error(`${command} error: ${msg}`); });
  commandProc.stderr.on('error', err => { throw err; });

  originalArchive.pipe(commandProc.stdin);
  commandProc.stdout.pipe(tarExtract);

  tarExtract.on('entry', (header, stream, next) => {
    zipPack.append(stream, { name: header.name, date: header.mtime });
    stream.on('end', next);
  });

  tarExtract.on('finish', () => zipPack.finalize());
  zipPack.pipe(writeFile);

  return new Promise<ReadStream>((resolve, reject) => {
    const rejectWithError = (err: any): void =>
      reject(err instanceof Error ? err : new Error(err.message || err.toString()));

    writeFile.on('error', rejectWithError);
    writeFile.on('finish', () => resolve(fs.createReadStream(filePath)));
    tarExtract.on('error', err => {
      // tar-stream has a problem with the format of a few of the tar files
      // dealt with here, which nevertheless are valid archives.
      if (/unexpected end of data|invalid tar header/i.test(err.message))
        console.error('Archive %s: %s', url, err.message);
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
