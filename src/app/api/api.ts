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

  getTzReleaseNotes(): Promise<Record<string, string>> {
    return this.httpClient.get<Record<string, string>>('/api/tz-notes').toPromise();
  }

  getTzReleases(): Promise<string[]> {
    return this.httpClient.get<string[]>('/api/tz-releases').toPromise();
  }

  getTzVersion(): Promise<string> {
    return this.httpClient.get<string>('/api/tz-version').toPromise();
  }

  getTzVersions(withCode = false): Promise<string[]> {
    return this.httpClient.get<string[]>(`/api/tz-versions${withCode ? '?code' : ''}`).toPromise();
  }
}
