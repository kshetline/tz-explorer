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

  it('should get time', async function () {
    this.slow(10000);
    this.timeout(60000);
    poller = new NtpPoolPoller();
    const debugTime = new Date('2021-12-31T23:59:45Z');
    poller.setDebugTime(debugTime, 1);

    await new Promise<void>(resolve => {
      const checkAcquired = () => {
        if (poller.isTimeAcquired())
          resolve();
        else
          setTimeout(checkAcquired, 100);
      };

      checkAcquired();
    });

    await new Promise<void>(resolve => {
      const checkTime = () => {
        const t = poller.getTimeInfo();

        console.log(t.text, t.time, t.leapExcess, processMillis());

        if (t.time > +debugTime + 17000)
          resolve();
        else
          setTimeout(checkTime, 50);
      };

      checkTime();
    });

    expect(poller.getTimeInfo().time).greaterThan(0);
  });
});
