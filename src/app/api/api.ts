import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TimeInfo } from '../../../server/src/shared-types';

@Injectable()
export class TzExplorerApi {
  constructor(private httpClient: HttpClient) {
  }

  getServerTime(): Promise<TimeInfo> {
    return this.httpClient.get<TimeInfo>('/api/time').toPromise();
  }
}
