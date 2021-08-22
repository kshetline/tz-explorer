// #!/usr/bin/env node
/*
  Copyright © 2021 Kerry Shetline, kerry@shetline.com

  MIT license: https://opensource.org/licenses/MIT

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
  documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
  rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
  persons to whom the Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
  Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
  WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
  COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import { execSync } from 'child_process';
import cookieParser from 'cookie-parser';
import { Daytime, DaytimeData, DEFAULT_DAYTIME_SERVER } from './daytime';
import express, { Express } from 'express';
import http from 'http';
import { asLines, isString, processMillis, toBoolean } from '@tubular/util';
import logger from 'morgan';
import { DEFAULT_NTP_SERVER } from './ntp';
import { NtpPoller } from './ntp-poller';
import fs, { ReadStream } from 'fs';
import path from 'path';
import { DEFAULT_LEAP_SECOND_URLS, TaiUtc } from './tai-utc';
import { jsonOrJsonp, noCache, normalizePort, timeStamp, unref } from './tze-util';
import os from 'os';
import { getAvailableVersions } from '@tubular/time-tzdb';
import { getDbProperty, getVersionData, hasVersion, pool, saveVersion, setDbProperty } from './db-access';
import { getTzData, TzFormat, TzPresets } from '@tubular/time-tzdb/dist/tz-writer';
import { sendMailMessage } from './mail';
import { codeAndDataToZip, codeToZip, dataToZip } from './archive-convert';

const debug = require('debug')('express:server');

// Create HTTP server
const devMode = process.argv.includes('-d');
const allowCors = toBoolean(process.env.TZE_ALLOW_CORS) || devMode;
const defaultPort = devMode ? 4201 : 8080;
const httpPort = normalizePort(process.env.TZE_PORT || defaultPort);
const app = getApp();
let httpServer: http.Server;
const MAX_START_ATTEMPTS = 3;
let startAttempts = 0;
let savingZoneInfo = false;
let shuttingDown = false;

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGUSR2', shutdown);
process.on('unhandledRejection', err => console.error(`${timeStamp()} -- Unhandled rejection:`, err));

// Poll for tz-database updates
const UPDATE_POLL_INTERVAL = 1_800_000; // 30 minutes
const UPDATE_POLL_RETRY_TIME = 30_000; // 5 minutes
let updatePollTimer: any;
let tzVersions: string[] = [];

async function checkForUpdate(): Promise<void> {
  updatePollTimer = undefined;

  let delay = UPDATE_POLL_INTERVAL;
  let currentVersion: string;
  const connection = await pool.getConnection();

  try {
    currentVersion = await getDbProperty(connection, 'tz_latest');
    tzVersions = (await getAvailableVersions()).reverse();

    for (const version of tzVersions) {
      if (shuttingDown)
        break;

      const exists = await hasVersion(connection, version);

      if (!exists) {
        console.log(`${timeStamp()}: Creating data for ${version}`);

        try {
          const json = await getTzData({
            preset: TzPresets.LARGE,
            systemV: true,
            urlOrVersion: version
          }, true);
          const small = (version < '2021a' ? null : await getTzData({
            format: TzFormat.TYPESCRIPT,
            preset: TzPresets.SMALL,
            systemV: true,
            urlOrVersion: version
          }));
          const large = (version < '2021a' ? null : await getTzData({
            format: TzFormat.TYPESCRIPT,
            preset: TzPresets.LARGE,
            systemV: true,
            urlOrVersion: version
          }));
          const largeAlt = (version < '2021a' ? null : await getTzData({
            format: TzFormat.TYPESCRIPT,
            preset: TzPresets.LARGE_ALT,
            systemV: true,
            urlOrVersion: version
          }));

          if (!shuttingDown) {
            savingZoneInfo = true;
            console.log(`${timeStamp()}: Saving data for ${version}`);
            await saveVersion(connection, version, json, small, large, largeAlt);
            console.log(`${timeStamp()}: Data saved for ${version}`);
            savingZoneInfo = false;
          }
        }
        catch (e) {
          console.error(`${timeStamp()}: Error while creating/saving data for ${version} - ${e.message || e.toString()}`);
        }
      }
    }

    const latestVersion = tzVersions[0];

    if (latestVersion && latestVersion > currentVersion) {
      try {
        await setDbProperty(connection, 'tz_latest', latestVersion);
        await sendMailMessage('Timezone update to ' + latestVersion, `Update to ${latestVersion} detected at ${timeStamp()}.`);
      }
      catch (e) {
        console.error(`${timeStamp()}: Error while reporting ${latestVersion} update - ${e.message || e.toString()}`);
      }
    }
  }
  catch (e) {
    delay = UPDATE_POLL_RETRY_TIME;

    if (os.uptime() > 90)
      console.error('%s: Update info request failed: %s', timeStamp(), e.message ?? e.toString());
  }
  finally {
    connection.release();
  }

  updatePollTimer = unref(setTimeout(checkForUpdate, delay));
}

checkForUpdate().finally();

const ntpServer = process.env.TZE_NTP_SERVER || DEFAULT_NTP_SERVER;
const ntpPoller = new NtpPoller(ntpServer);
const daytimeServer = process.env.TZE_DAYTIME_SERVER || DEFAULT_DAYTIME_SERVER;
const daytime = new Daytime(daytimeServer);
const leapSecondsUrls = process.env.TZE_LEAP_SECONDS_URL || DEFAULT_LEAP_SECOND_URLS;
const taiUtc = new TaiUtc(leapSecondsUrls);

function createAndStartServer(): void {
  console.log(`*** Starting server on port ${httpPort} at ${timeStamp()} ***`);
  console.log(`*** user: ${process.env.USER}, pid: ${process.pid}, cwd: ${__dirname} ***`);

  sendMailMessage('tzexplorer.org server start-up',
    `Server started at ${timeStamp()}, pid: ${process.pid}`).catch(err => console.error(err));

  if (process.env.TZE_ZIP_DIR && !fs.existsSync(process.env.TZE_ZIP_DIR))
    fs.mkdirSync(process.env.TZE_ZIP_DIR, { recursive: true });

  httpServer = http.createServer(app);
  httpServer.on('error', onError);
  httpServer.on('listening', onListening);
  httpServer.listen(httpPort);
}

function onError(error: any): void {
  if (error.syscall !== 'listen')
    throw error;

  const bind = isString(httpPort) ? 'Pipe ' + httpPort : 'Port ' + httpPort;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');

      if (!canReleasePortAndRestart())
        process.exit(1);

      break;
    default:
      throw error;
  }
}

function onListening(): void {
  const addr = httpServer.address();
  const bind = isString(addr) ? 'pipe ' + addr : 'port ' + addr.port;

  debug('Listening on ' + bind);
}

function canReleasePortAndRestart(): boolean {
  if (process.env.USER !== 'root' || !toBoolean(process.env.TZE_LICENSED_TO_KILL) || ++startAttempts > MAX_START_ATTEMPTS)
    return false;

  try {
    const lines = asLines(execSync('netstat -pant').toString());

    for (const line of lines) {
      const $ = new RegExp(String.raw`^tcp.*:${httpPort}\b.*\bLISTEN\b\D*(\d+)\/node`).exec(line);

      if ($) {
        const signal = (startAttempts > 1 ? '-9 ' : '');

        console.warn('%s -- Killing process: %s', timeStamp(), $[1]);
        execSync(`kill ${signal}${$[1]}`);
        unref(setTimeout(createAndStartServer, 3000));

        return true;
      }
    }
  }
  catch (err) {
    console.log(`${timeStamp()} -- Failed to kill process using port ${httpPort}: ${err}`);
  }

  return false;
}

async function shutdown(signal?: string): Promise<void> {
  if (devMode && signal === 'SIGTERM')
    return;

  shuttingDown = true;
  const beginningOfTheEnd = processMillis();
  const maxWait = savingZoneInfo ? 60000 : 5000;
  let ready = false;

  if (updatePollTimer)
    clearTimeout(updatePollTimer);

  console.log(`\n*** ${signal ? signal + ': ' : ''}closing server at ${timeStamp()} ***`);
  // Make sure that if an orderly clean-up gets stuck, shutdown still happens.
  unref(setTimeout(() => process.exit(0), maxWait));
  try {
    await sendMailMessage('tzexplorer.org server shutdown', 'Server shut down at ' + timeStamp());
  }
  finally {
    ready = true;
  }

  const exitWhenReady = (): void => {
    if (!ready && processMillis() < beginningOfTheEnd + maxWait)
      setTimeout(exitWhenReady, 100);
    else
      process.exit(0);
  };

  NtpPoller.closeAll();
  httpServer.close(exitWhenReady);
}

function getApp(): Express {
  const theApp = express();

  theApp.use(logger('[:date[iso]] :remote-addr - :remote-user ":method :url HTTP/:http-version" :status :res[content-length] :response-time'));
  theApp.use(express.json());
  theApp.use(express.urlencoded({ extended: false }));
  theApp.use(cookieParser());
  theApp.use(express.static(path.join(__dirname, 'public')));
  theApp.get('/', (req, res) => {
    res.send('Static home file not found');
  });

  if (allowCors) {
    // see: http://stackoverflow.com/questions/7067966/how-to-allow-cors-in-express-nodejs
    theApp.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // intercept OPTIONS method
      if (req.method === 'OPTIONS')
        res.send(200);
      else {
        next();
      }
    });
  }

  theApp.get(/^\/api\/(ntp|time)/, (req, res) => {
    noCache(res);
    jsonOrJsonp(req, res, ntpPoller.getTimeInfo());
  });

  theApp.get('/api/daytime', async (req, res) => {
    noCache(res);

    let time: DaytimeData;

    try {
      time = await daytime.getDaytime();
    }
    catch (err) {
      res.status(500).send(err.toString());

      return;
    }

    if (req.query.callback)
      res.jsonp(time);
    else if (req.query.json != null)
      res.json(time);
    else
      res.send(time.text);
  });

  theApp.get('/api/tai-utc', async (req, res) => {
    noCache(res);
    jsonOrJsonp(req, res, await taiUtc.getCurrentDelta());
  });

  theApp.get('/api/ls-history', async (req, res) => {
    noCache(res);
    jsonOrJsonp(req, res, await taiUtc.getLeapSecondHistory());
  });

  theApp.get('/api/tz-versions', async (req, res) => {
    noCache(res);
    jsonOrJsonp(req, res, tzVersions);
  });

  theApp.get('/api/tz-version', async (req, res) => {
    noCache(res);
    jsonOrJsonp(req, res, tzVersions[0] || null);
  });

  const tzDataUrl = /^\/tzdata\/timezone(?:s?)([-_](\d\d\d\d[a-z][a-z]?))?([-_](small|large|large[-_]alt))?\.(js|json|ts)$/i;

  theApp.get(tzDataUrl, async (req, res) => {
    noCache(res);

    const connection = await pool.getConnection();
    const [, , tzVersion, , edition, ext] = tzDataUrl.exec(req.url.toLowerCase());

    try {
      const version = tzVersion || await getDbProperty(connection, 'tz_latest');
      const format = (ext === 'js' || ext === 'ts' ? edition?.replace(/-/g, '_') || 'large' :
        (edition ? '' : 'json'));

      if (version && format) {
        let data = await getVersionData(connection, version, format);

        if (data) {
          if (ext === 'js')
            data = data.replace(/export default/g, 'module.exports =');

          res.set('Content-Type', 'text/plain');
          res.send(data);
        }
        else
          res.status(401).send('File not found');
      }
      else
        res.status(401).send('File not found');
    }
    finally {
      connection.release();
    }
  });

  const tzArchiveUrl = /^\/tzdata\/tz(code|data|db-)([a-z0-9]+)\.zip$/i;

  theApp.get(tzArchiveUrl, async (req, res) => {
    noCache(res);

    const [, edition, tzVersion] = tzArchiveUrl.exec(req.url.toLowerCase());

    if (!tzVersions.includes(tzVersion)) {
      res.status(401).send('File not found');

      return;
    }

    let fileStream: ReadStream;

    try {
      if (edition === 'code')
        fileStream = await codeToZip(tzVersion);
      else if (edition === 'data')
        fileStream = await dataToZip(tzVersion);
      else
        fileStream = await codeAndDataToZip(tzVersion);

      res.set('Content-Type', 'application/zip');
      fileStream.pipe(res);
    }
    catch {}
  });

  return theApp;
}

createAndStartServer();