import { Component, HostListener, OnInit } from '@angular/core';
import { TzExplorerApi } from './api/api';
import { AppService, AppTab } from './app.service';

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

  private _tabIndex = AppTab.CLOCKS;

  latestTzVersion = '';
  releaseNote = '';
  window = window;

  constructor(
    private app: AppService,
    private api: TzExplorerApi
  ) {
    app.getCurrentTabUpdates(tabIndex => this._tabIndex = tabIndex);
  }

  ngOnInit(): void {
    this.checkTzVersion();
  }

  get tabIndex(): number { return this._tabIndex; }
  set tabIndex(value: number) {
    if (this._tabIndex !== null) {
      this._tabIndex = value;
      this.app.currentTab = value;
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

  @HostListener('window:beforeunload')
  updatePreferences(): void {
    this.app.updatePreferences();
  }
}
