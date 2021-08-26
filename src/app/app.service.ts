import { Injectable } from '@angular/core';
import { Timezone } from '@tubular/time';
import { clone } from '@tubular/util';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

export interface ExtraClock {
  localFormat: boolean;
  zone: string;
}

export interface TzePreferences {
  extraClocks?: ExtraClock[];
  runClock?: boolean;
}

export enum AppTab { CLOCKS, HISTORY, DOWNLOADS }
const tabNames = ['clocks', 'history', 'downloads'];
export const DEFAULT_EXTRA_ZONE = (Timezone.guess() === 'America/New_York' ? 'Europe/Paris' : 'America/New_York');

@Injectable()
export class AppService {
  private _currentTab = new BehaviorSubject<AppTab>(AppTab.CLOCKS);
  private currentTabObserver: Observable<AppTab> = this._currentTab.asObservable();
  private readonly prefs: TzePreferences;
  private prefsTimer: any;

  constructor(private router: Router) {
    try {
      this.prefs = JSON.parse(localStorage.getItem('tze-prefs'));
    }
    catch {}

    if (!this.prefs)
      this.prefs = {};

    this.prefs.extraClocks = this.prefs.extraClocks ?? [{ localFormat: false, zone: DEFAULT_EXTRA_ZONE }];
    this.prefs.runClock = this.prefs.runClock ?? true;

    router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const url = event.url;
        const newTab = tabNames.map(name => '/' + name).indexOf(url);

        if (newTab >= 0)
          this.currentTab = newTab;
        else
          this.currentTab = AppTab.CLOCKS;
      }
    });
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

  get currentTab(): AppTab { return this._currentTab.getValue(); }
  set currentTab(newTab: AppTab) {
    if (this._currentTab.getValue() !== newTab) {
      this._currentTab.next(newTab);
      this.router.navigate(['/' + tabNames[this._currentTab.getValue()]]).then(foo => console.log(foo)).catch(err => console.error(err));
    }
  }

  getCurrentTabUpdates(callback: (tabIndex: AppTab) => void): Subscription {
    return this.currentTabObserver.subscribe(callback);
  }
}
