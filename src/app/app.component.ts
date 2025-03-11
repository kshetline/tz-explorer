import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { TzExplorerApi } from './api/api';
import { AppService, AppTab, IS_MOBILE } from './app.service';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { ClocksComponent } from './clocks/clocks.component';
import { ZoneHistoryComponent } from './zone-history/zone-history.component';
import { DownloadsComponent } from './downloads/downloads.component';
import { CodeComponent } from './code/code.component';
import { ReleaseNoteComponent } from './release-note/release-note.component';

@Component({
  selector: 'tze-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [Tabs, TabList, Tab, TabPanels, TabPanel, ClocksComponent, ZoneHistoryComponent, DownloadsComponent,
            CodeComponent, ReleaseNoteComponent]
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
