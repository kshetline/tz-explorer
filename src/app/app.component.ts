import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { TzExplorerApi } from './api/api';
import { AppService, AppTab, IS_MOBILE } from './app.service';

@Component({
  selector: 'tze-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  CLOCKS = AppTab.CLOCKS;
  CODE = AppTab.CODE;
  DOWNLOADS = AppTab.DOWNLOADS;
  HISTORY = AppTab.HISTORY;
  mobile = IS_MOBILE;

  private _tabIndex = AppTab.CLOCKS;
  private title: HTMLElement;

  latestTzVersion = '';
  releaseNote = '';
  window = window;

  @ViewChild('title', { static: true }) titleRef: ElementRef;

  constructor(
    private app: AppService,
    private api: TzExplorerApi
  ) {
    app.getCurrentTabUpdates(tabIndex => this._tabIndex = tabIndex);
    app.ensureTitleOnTop = (): void => this.title?.scrollIntoView();
  }

  ngOnInit(): void {
    this.title = this.titleRef.nativeElement;
    this.checkTzVersion();
  }

  get notes(): Record<string, string> { return this.app.notes; };

  get tabIndex(): number { return this._tabIndex; }
  set tabIndex(value: number) {
    if (this._tabIndex !== null) {
      this._tabIndex = value;
      this.app.currentTab = value;

      if (this.mobile) {
        this.title?.focus();
        this.title?.scrollIntoView();
      }
    }
  }

  checkTzVersion = (): void => {
    let recheckTime = 10000;

    this.api.getTzVersion().then(version => {
      if (version) {
        this.latestTzVersion = version;
        recheckTime = 600_000;
      }
    })
      .finally(() => setTimeout(this.checkTzVersion, recheckTime));
  };

  @HostListener('window:visibilitychange')
  updatePreferences(): void {
    this.app.updatePreferences();
  }
}
