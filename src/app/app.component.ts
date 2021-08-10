import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DateTime, Timezone } from '@tubular/time';
import { abs, max } from '@tubular/math';
import { last } from '@tubular/util';

interface ExtraClock {
  localFormat: boolean;
  zone: string;
}

interface TzePreferences {
  extraClocks?: ExtraClock[];
  runClock?: boolean;
}

const DEFAULT_EXTRA_ZONE = (Timezone.guess() === 'America/New_York' ? 'Europe/Paris' : 'America/New_York');
const EARLIEST_TAI = new DateTime('1958-01-01 UTC').taiMillis;
const EARLIEST_UTC = EARLIEST_TAI;
const EARLIEST_UTC_TRANSITION = new DateTime('1958-01-01 UTC').subtract('days', 365).taiMillis;
const UTC_OFFICIAL_START = new DateTime('1972-01-01 UTC').taiMillis;

@Component({
  selector: 'tze-root',
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
  latestUtc = new DateTime().taiMillis;
  latestUtcTransition = this.latestUtc + 31536000000; // plus 365 days
  localZone = Timezone.guess();
  selectLocal = false;
  selectedTimezone = DEFAULT_EXTRA_ZONE;
  showAddClockDialog = false;
  time = new DateTime().taiSeconds * 1000;

  @ViewChild('localClock', { read: ElementRef, static: true }) localClock: ElementRef;

  constructor() {
    this.computeUtcRange();

    let settings: TzePreferences;

    try {
      settings = JSON.parse(localStorage.getItem('tze-prefs'));
    }
    catch {}

    if (settings) {
      this.extraClocks = settings.extraClocks ?? this.extraClocks;
      this.running = settings.runClock ?? true;
    }
  }

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

  get taiForm(): string {
    if (this.time < EARLIEST_TAI)
      return 'Proleptic TAI';
    else
      return 'TAI';
  }

  get utForm(): string {
    if (this.time < EARLIEST_UTC_TRANSITION || this.time > this.latestUtcTransition)
      return 'UT (estimated)';
    else if (this.time < EARLIEST_UTC || this.time > this.latestUtc)
      return 'UT/UTC (transitional)';
    else if (this.time < UTC_OFFICIAL_START)
      return 'Proleptic UTC';
    else
      return 'UTC';
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
      this.timer = setTimeout(this.updateTime, 1000 - this.time % 1000);
  }

  now(): void {
    this.time = new DateTime().taiMillis;
  }

  closeClock(index: number): void {
    this.extraClocks.splice(index, 1);
  }

  openNewClockDialog(): void {
    this.showAddClockDialog = true;
    this.selectLocal = false;
  }

  createClock(): void {
    this.extraClocks.push({ localFormat: this.selectLocal, zone: this.selectedTimezone });
  }

  @HostListener('window:beforeunload')
  saveSettings(): void {
    const settings: TzePreferences = {
      extraClocks: this.extraClocks,
      runClock: this.running
    };

    try {
      localStorage.setItem('tze-prefs', JSON.stringify(settings));
    }
    catch {}
  }

  private computeUtcRange(): void {
    const lastLeap = last(Timezone.getLeapSecondList());
    const date = new DateTime(max(lastLeap?.utcMillis ?? 0, Date.now()), 'UTC').wallTimeSparse;

    this.latestUtc = new DateTime({ y: date.y + 1, m: date.m < 7 ? 1 : 7, d: 1 }, 'UTC').taiMillis;
    this.latestUtcTransition = this.latestUtc + 31536000000; // plus 365 days;
  }
}
