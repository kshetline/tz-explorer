import { Component, OnInit } from '@angular/core';
import { TzExplorerApi } from '../api/api';

@Component({
  selector: 'tze-downloads',
  templateUrl: './downloads.component.html',
  styleUrls: ['./downloads.component.scss']
})
export class DownloadsComponent implements OnInit {
  releases = new Set<string>();
  versions: string[] = [];

  constructor(private api: TzExplorerApi) {}

  ngOnInit(): void {
    this.api.getTzReleases()
      .then(releases => this.releases = new Set(releases))
      .catch(err => console.error('Error retrieving available timezone releases:', err));

    this.api.getTzVersions()
      .then(versions => this.versions = versions)
      .catch(err => console.error('Error retrieving available timezone versions:', err));
  }

  getTarCodeLink(version: string): string {
    if (version === '2006b')
      return 'https://data.iana.org/time-zones/releases/tz64code2006b.tar.gz';
    else
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

  linkValid(link: string): boolean {
    return this.releases.has(this.nameFromLink(link));
  }

  nameFromLink(link: string): string {
    return link.replace(/^.*\//, '');
  }
}
