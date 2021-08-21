import { Injectable } from '@angular/core';
import { Timezone } from '@tubular/time';
import { clone } from '@tubular/util';

export interface ExtraClock {
  localFormat: boolean;
  zone: string;
}

export interface TzePreferences {
  extraClocks?: ExtraClock[];
  runClock?: boolean;
}

export const DEFAULT_EXTRA_ZONE = (Timezone.guess() === 'America/New_York' ? 'Europe/Paris' : 'America/New_York');

@Injectable()
export class AppService {
  private readonly prefs: TzePreferences;
  private prefsTimer: any;

  constructor() {
    try {
      this.prefs = JSON.parse(localStorage.getItem('tze-prefs'));
    }
    catch {}

    if (!this.prefs)
      this.prefs = {};

    this.prefs.extraClocks = this.prefs.extraClocks ?? [{ localFormat: false, zone: DEFAULT_EXTRA_ZONE }];
    this.prefs.runClock = this.prefs.runClock ?? true;
  }

  get preferences(): TzePreferences { return clone(this.prefs); }

  updatePreferences(newPrefs?: TzePreferences): void {
    if (!newPrefs) {
      if (this.prefsTimer) {
        clearTimeout(this.prefsTimer);
        this.prefsTimer = undefined;
      }

      try {
        localStorage.setItem('tze-prefs', JSON.stringify(this.prefs));
      }
      catch {}
    }
    else {
      Object.assign(this.prefs, newPrefs);

      if (!this.prefsTimer)
        this.prefsTimer = setTimeout(() => this.updatePreferences(), 5000);
    }
  }
}
