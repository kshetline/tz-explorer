import { Component, OnInit } from '@angular/core';
import { TzExplorerApi } from '../api/api';
import { htmlEscape } from '@tubular/util';

function adjustVersion(version: string): string {
  if (version < '1996l')
    version = version.substr(2);

  if (version === '93a')
    version = '93';

  return version;
}

@Component({
  selector: 'tze-downloads',
  templateUrl: './downloads.component.html',
  styleUrls: ['./downloads.component.scss']
})
export class DownloadsComponent implements OnInit {
  displayNote = '';
  notes: Record<string, string> = {};
  releases = new Set<string>();
  versions: string[] = [];

  constructor(private api: TzExplorerApi) {}

  ngOnInit(): void {
    this.api.getTzReleaseNotes()
      .then(notes => this.notes = notes)
      .catch(err => console.error('Error retrieving release notes:', err));

    this.api.getTzReleases()
      .then(releases => this.releases = new Set(releases))
      .catch(err => console.error('Error retrieving available timezone releases:', err));

    this.api.getTzVersions(true)
      .then(versions => this.versions = versions)
      .catch(err => console.error('Error retrieving available timezone versions:', err));
  }

  getTarCodeLink(version: string): string {
    const suffix = (version < '1993g' ? 'Z' : 'gz');

    version = adjustVersion(version);

    if (version === '2006b')
      return `https://data.iana.org/time-zones/releases/tz64code2006b.tar.${suffix}`;
    else
      return `https://data.iana.org/time-zones/releases/tzcode${version}.tar.${suffix}`;
  }

  getTarDataLink(version: string): string {
    const suffix = (version < '1993g' ? 'Z' : 'gz');

    version = adjustVersion(version);

    return `https://data.iana.org/time-zones/releases/tzdata${version}.tar.${suffix}`;
  }

  getTarFullLink(version: string): string {
    version = adjustVersion(version);

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

  getNote(version: string): string {
    return this.notes[version]
      .replace(/\n( )+/g, (m: string) => '\n' + '\xA0'.repeat(2 * (m.length - 1)))
      .split('\n').map((s, index) => {
        s = `<div>${htmlEscape(s) || '&nbsp;'}</div>`;

        if (index === 0) {
          const $ = /^<div>(Release )([-0-9a-z]+) (.+)<\/div>$/.exec(s);

          if ($)
            s = `<div class="top-line">${$[1]}<span class="release">${$[2]}</span> <span class="date-time">${$[3]}</span></div>`;
        }

        return s;
      }).join('\n') + '\n<i class="pi pi-times closer"></i>\n';
  }

  onNoteClick(evt: MouseEvent): void {
    if ((evt.target as HTMLElement).classList?.contains('closer'))
      this.displayNote = '';
    else
      evt.stopPropagation();
  }
}
