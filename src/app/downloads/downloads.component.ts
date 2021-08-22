import { Component, OnInit } from '@angular/core';
import { TzExplorerApi } from '../api/api';

@Component({
  selector: 'tze-downloads',
  templateUrl: './downloads.component.html',
  styleUrls: ['./downloads.component.scss']
})
export class DownloadsComponent implements OnInit {
  versions: string[] = [];

  constructor(private api: TzExplorerApi) {}

  ngOnInit(): void {
    this.api.getTzVersions()
      .then(versions => this.versions = versions)
      .catch(err => console.error('Retrieving available timezone versions:', err));
  }

  getTarCodeLink(version: string): string {
    return `https://data.iana.org/time-zones/releases/tzcode${version}.tar.gz`;
  }

  getTarDataLink(version: string): string {
    return `https://data.iana.org/time-zones/releases/tzdata${version}.tar.gz`;
  }

  getTarFullLink(version: string): string {
    return `https://data.iana.org/time-zones/releases/tzdb-${version}.tar.lz`;
  }

  getZipCodeLink(version: string): string {
    return `/tzdata/tzcode${version}.zip`;
  }

  getZipDataLink(version: string): string {
    return `/tzdata/tzdata${version}.zip`;
  }

  getZipFullLink(version: string): string {
    return `/tzdata/tzdb-${version}.zip`;
  }

  nameFromLink(link: string): string {
    return link.replace(/^.*\//, '');
  }
}
