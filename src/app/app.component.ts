import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DateTime, Timezone } from '@tubular/time';
import { abs } from '@tubular/math';

interface ExtraClock {
  localFormat: boolean;
  zone: string;
}

const DEFAULT_EXTRA_ZONE = (Timezone.guess() === 'America/New_York' ? 'Europe/Paris' : 'America/New_York');

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy, OnInit {
  ISO_OPTS = ['ISO', { millisDigits: 3, showSeconds: true }];
  LOCAL_OPTS = { showDstSymbol: true, showOccurrence: true, showSeconds: true, showUtcOffset: true, twoDigitYear: false };
  MIN_YEAR = '1000';
  MAX_YEAR = '4000';

  private _running = true;
  private timer: any;

  extraClocks: ExtraClock[] = [{ localFormat: false, zone: DEFAULT_EXTRA_ZONE }];
  localZone = Timezone.guess();
  time = new DateTime().taiMillis;

  @ViewChild('localClock', { read: ElementRef, static: true }) localClock: ElementRef;

  ngOnInit(): void {
    this.updateTime();
  }

  ngOnDestroy(): void {
    if (this.timer)
      clearTimeout(this.timer);

    this.timer = undefined;
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
        this.timer = setTimeout(this.updateTime);
      else {
        if (this.timer)
          clearTimeout(this.timer);

        this.timer = undefined;
        setTimeout(() => ((this.localClock.nativeElement as HTMLElement)
          .querySelector('.tbw-dse-wrapper') as HTMLElement)?.focus());
      }
    }
  }

  updateTime = (): void => {
    this.time = new DateTime().taiMillis;
    this.time = this.time - (this.time % 1000);

    if (this.running)
      setTimeout(this.updateTime, 1000 - this.time % 1000);
  }
}
