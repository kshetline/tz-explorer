import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DateTime, Timezone } from '@tubular/time';
import { abs } from '@tubular/math';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy, OnInit {
  private _running = true;

  localZone = Timezone.guess();
  time = new DateTime().taiMillis;

  @ViewChild('localClock', { read: ElementRef, static: true }) localClock: ElementRef;

  ngOnInit(): void {
    this.updateTime();
  }

  ngOnDestroy(): void {
    this.running = false;
  }

  get deltaTai(): string {
    const dt = new DateTime({ tai: this.time }, 'TAI').deltaTaiMillis / 1000;

    return (dt < 0 ? '+ ' : '- ') + abs(dt).toFixed(3).replace(/\.?0*$/, '');
  }

  get gps(): number { return this.time - 19000; }
  set gps(newValue: number) {
    if (this.gps !== newValue) {
      this.time = newValue + 19000;
    }
  }

  get tt(): number { return this.time + 32184; }
  set tt(newValue: number) {
    if (this.tt !== newValue) {
      this.time = newValue - 32184;
    }
  }

  get running(): boolean { return this._running; }
  set running(newValue: boolean) {
    if (this._running !== newValue) {
      this._running = newValue;

      if (newValue)
        setTimeout(this.updateTime);
      else
        setTimeout(() => ((this.localClock.nativeElement as HTMLElement)
          .querySelector('.tbw-dse-wrapper') as HTMLElement)?.focus());
    }
  }

  updateTime = (): void => {
    this.time = new DateTime().taiMillis;
    this.time = this.time - (this.time % 1000);

    if (this.running)
      setTimeout(this.updateTime, 1000 - this.time % 1000);
  }
}
