import { Component } from '@angular/core';
import { DateTime } from '@tubular/time';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  native = false;
  time = new DateTime().taiMillis;
  title = 'tz-explorer';

  now(): void {
    this.time = new DateTime().taiMillis;
  }
}
