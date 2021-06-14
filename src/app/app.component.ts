import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  Date = Date;

  native = false;
  time = Date.now();
  title = 'tz-explorer';
}
