import { PassThrough, Readable } from 'stream';

export function tapStream(inStream: Readable, callback: (content: string) => void): PassThrough {
  const outStream = new PassThrough();
  let content = '';

  inStream.on('data', data => {
    content += data;
    outStream.emit('data', data);
  });

  inStream.on('end', () => {
    callback(content);
    outStream.emit('end');
  });

  inStream.on('close', () => outStream.emit('close'));
  inStream.on('pause', () => outStream.emit('pause'));
  inStream.on('resume', () => outStream.emit('resume'));
  inStream.on('error', err => outStream.emit('error', err));

  return outStream;
}
