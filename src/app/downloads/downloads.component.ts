import { Component } from '@angular/core';
import { AppService } from '../app.service';
import { ReleaseNoteComponent } from '../release-note/release-note.component';

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
  styleUrls: ['./downloads.component.scss'],
  imports: [ReleaseNoteComponent]
})
export class DownloadsComponent {
  releaseNote = '';

  constructor(private app: AppService) {}

  get notes(): Record<string, string> { return this.app.notes; };

  get versions(): string[] { return this.app.versions; };

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

  getTypeScriptLink(version: string, size: string): string {
    return `/tzdata/timezone-${version}-${size}.ts`;
  }

  linkValid(link: string): boolean {
    return this.app.releases.has(this.nameFromLink(link));
  }

  nameFromLink(link: string): string {
    return link.replace(/^.*\//, '');
  }
}
