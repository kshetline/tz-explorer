import { NtpData } from '../../../server/src/ntp-data';
import { TimePoller } from '../../../server/src/time-poller';
import { TzExplorerApi } from '../api/api';
import { Injectable } from '@angular/core';

@Injectable()
export class HttpTimePoller extends TimePoller {
  constructor(private api: TzExplorerApi) {
    super();
  }

  async getNtpData(_requestTime?: number): Promise<NtpData> {
    const data = await this.api.getServerTime();

    return {
      li: [2, 0, 1][data.leapSecond + 1],
      rxTm: data.time,
      txTm: data.time,
    } as NtpData;
  }
}
