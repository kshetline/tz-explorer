import { Component, EventEmitter, Input, Output } from '@angular/core';
import { htmlEscape } from '@tubular/util';
import { AppService } from '../app.service';

@Component({
  selector: 'tze-release-note',
  templateUrl: './release-note.component.html'
})
export class ReleaseNoteComponent {
  private _release = '';

  @Output() releaseChange = new EventEmitter<string>();

  get release(): string { return this._release; }
  @Input() set release(value: string) {
    this._release = value;
    this.releaseChange.emit(value);
  }

  constructor(private app: AppService) {}

  getNote(version: string): string {
    return this.app.notes[version]
      .replace(/\n( )+/g, (m: string) => '\n' + '\xA0'.repeat(2 * (m.length - 1)))
      .split('\n').map((s, index) => {
        s = `<div>${htmlEscape(s) || '&nbsp;'}</div>`;

        if (index === 0) {
          const $ = /^<div>(Release )([-0-9a-z]+) (.+)<\/div>$/.exec(s);

          if ($)
            s = `<div class="top-line"><span class="release">${$[1]}</span><span class="release-version">` +
              `${$[2]}</span> <span class="date-time">${$[3]}</span>` +
              `<div class="top-mask">&nbsp;</div><i class="pi pi-times closer"></i></div>`;
        }

        return s;
      }).join('\n');
  }

  onNoteClick(evt: MouseEvent): void {
    if ((evt.target as HTMLElement).classList?.contains('closer'))
      this.release = '';
    else
      evt.stopPropagation();
  }
}
