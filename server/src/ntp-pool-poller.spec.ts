import { expect } from 'chai';
import { NtpPoolPoller } from './ntp-pool-poller';
import { afterEach, describe, it } from 'mocha';
import { processMillis } from '@tubular/util';

describe('ntp-pool-poller', () => {
  let poller: NtpPoolPoller;

  afterEach(() => {
    if (poller) {
      poller.close();
      poller = undefined;
    }
  });

  it('should handle averaging NTP poller, with or without leap seconds', async function () {
    this.slow(45000);
    this.timeout(90000);

    for (let ii = 0; ii < 9; ++ii) {
      const i = ii % 3;
      poller = new NtpPoolPoller();
      let debugTime = new Date('2091-12-31T23:59:50Z');
      poller.setDebugTime(debugTime, [0, 1, -1][i]);

      await new Promise<void>(resolve => {
        const checkAcquired = () => {
          if (poller.isTimeAcquired())
            resolve();
          else
            setTimeout(checkAcquired, 100);
        };

        checkAcquired();
      });

      let lastTime = 0;
      let secs = '';
      let change = 0;

      await new Promise<void>(resolve => {
        const checkTime = () => {
          const t = poller.getTimeInfo();

          if (/^209[12]/.test(t.text)) {
            expect(t.time > lastTime);
            lastTime = t.time;
            const sec = t.text.substr(17, 2);
            const now = processMillis();

            if (!secs.endsWith(sec)) {
              expect(now).to.be.greaterThan(change + 750, `changed too quickly from ${secs.slice(-2)} to ${sec}`);
              secs += (secs ? ',' : '') + sec;
              change = now;
              console.log(secs);
            }
          }

          if (t.time > +debugTime + 12000)
            resolve();
          else
            setTimeout(checkTime, 25);
        };

        checkTime();
      });

      expect(secs).match([/57,58,59,00,01,02$/, /57,58,59,60,00,01,02$/, /57,58,00,01,02$/][i]);
    }
  });
});
