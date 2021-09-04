import { Injectable, OnDestroy } from '@angular/core';
import { Timezone } from '@tubular/time';
import { clone } from '@tubular/util';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { TzExplorerApi } from './api/api';

export interface ExtraClock {
  localFormat: boolean;
  zone: string;
}

export interface TzePreferences {
  extraClocks?: ExtraClock[];
  runClock?: boolean;
}

export enum AppTab { CLOCKS, HISTORY, DOWNLOADS, CODE }
const tabNames = ['clocks', 'history', 'downloads', 'code'];
export const DEFAULT_EXTRA_ZONE = (Timezone.guess() === 'America/New_York' ? 'Europe/Paris' : 'America/New_York');

@Injectable()
export class AppService implements OnDestroy {
  private currentRelease = '';
  private _currentTab = new BehaviorSubject<AppTab>(AppTab.CLOCKS);
  private currentTabObserver: Observable<AppTab> = this._currentTab.asObservable();
  private _notes: Record<string, string> = {};
  private readonly prefs: TzePreferences;
  private prefsTimer: any;
  private _releases = new Set<string>();
  private readonly releaseTimer: any;
  private _timezones = Timezone.getAvailableTimezones();
  private _versions: string[] = [];

  constructor(
    private router: Router,
    private api: TzExplorerApi
  ) {
    try {
      this.prefs = JSON.parse(localStorage.getItem('tze-prefs'));
    }
    catch {}

    if (!this.prefs)
      this.prefs = {};

    this.prefs.extraClocks = this.prefs.extraClocks ?? [{ localFormat: false, zone: DEFAULT_EXTRA_ZONE }];
    this.prefs.runClock = this.prefs.runClock ?? true;

    this.updateReleaseInfo();
    this.releaseTimer = setInterval(() => this.updateReleaseInfo(true), 60000);

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

  ngOnDestroy(): void {
    if (this.releaseTimer)
      clearInterval(this.releaseTimer);
  }

  get notes(): Record<string, string> { return this._notes; };

  get preferences(): TzePreferences { return clone(this.prefs); }

  get releases(): Set<string> { return this._releases; }

  get timezones(): string[] { return this._timezones; }

  get versions(): string[] { return this._versions; };

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

  // noinspection JSUnusedGlobalSymbols
  get currentTab(): AppTab { return this._currentTab.getValue(); }
  set currentTab(newTab: AppTab) {
    if (this._currentTab.getValue() !== newTab) {
      this._currentTab.next(newTab);
      this.router.navigate(['/' + tabNames[this._currentTab.getValue()]]).catch(err => console.error(err));
    }
  }

  getCurrentTabUpdates(callback: (tabIndex: AppTab) => void): Subscription {
    return this.currentTabObserver.subscribe(callback);
  }

  updateReleaseInfo(checkLatestRelease = false): void {
    if (checkLatestRelease) {
      this.api.getTzVersion().then(version => {
        if (this.currentRelease !== version) {
          this.currentRelease = version;
          this.updateReleaseInfo();
        }
      });
    }
    else {
      this._timezones = Timezone.getAvailableTimezones();

      this.api.getTzReleaseNotes()
        .then(notes => this._notes = notes)
        .catch(err => console.error('Error retrieving release notes:', err));

      this.api.getTzReleases()
        .then(releases => this._releases = new Set(releases))
        .catch(err => console.error('Error retrieving available timezone releases:', err));

      this.api.getTzVersions(true)
        .then(versions => this._versions = versions)
        .catch(err => console.error('Error retrieving available timezone versions:', err));
    }
  }
}
