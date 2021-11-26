import { expect } from 'chai';
import { NtpPoolPoller } from './ntp-pool-poller';
import { afterEach, describe, it } from 'mocha';

describe('ntp-pool-poller', () => {
  let poller: NtpPoolPoller;

  afterEach(() => {
    if (poller) {
      poller.close();
      poller = undefined;
    }
  });

  it('should handle averaging NTP poller, with or without leap seconds', async function () {
    this.slow(40000);
    this.timeout(90000);

    for (let i = 0; i < 3; ++i) {
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

      await new Promise<void>(resolve => {
        const checkTime = () => {
          const t = poller.getTimeInfo();

          if (/^209[12]/.test(t.text)) {
            expect(t.time > lastTime);
            lastTime = t.time;
            const sec = t.text.substr(17, 2);

            if (!secs.endsWith(sec))
              secs += ',' + sec;
          }

          if (t.time > +debugTime + 12000)
            resolve();
          else
            setTimeout(checkTime, 50);
        };

        checkTime();
      });

      expect(secs).match([/57,58,59,00,01,02$/, /57,58,59,60,01,02$/, /57,58,00,01,02$/][i]);
    }
  });
});
