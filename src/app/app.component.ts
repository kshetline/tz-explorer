import { Component, OnInit } from '@angular/core';
import { TzExplorerApi } from './api/api';

@Component({
  selector: 'tze-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  latestTzVersion = '';

  constructor(private api: TzExplorerApi) {}

  ngOnInit(): void {
    this.checkTzVersion();
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
}
