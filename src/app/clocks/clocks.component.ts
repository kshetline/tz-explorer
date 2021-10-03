import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DateTime, Timezone, utToTaiMillis } from '@tubular/time';
import { abs, max } from '@tubular/math';
import { last } from '@tubular/util';
import { HttpTimePoller } from '../http-time-poller/http-time-poller';
import { TzExplorerApi } from '../api/api';
import { AppService, DEFAULT_EXTRA_ZONE, ExtraClock, IS_MOBILE } from '../app.service';

const EARLIEST_TAI = new DateTime('1958-01-01 UTC').taiMillis;
const EARLIEST_UTC = EARLIEST_TAI;
const EARLIEST_UTC_TRANSITION = new DateTime('1958-01-01 UTC').subtract('days', 365).taiMillis;
const UTC_OFFICIAL_START = new DateTime('1972-01-01 UTC').taiMillis;
const EARLIEST_GPS = new DateTime('1980-01-06 UTC').taiMillis;

@Component({
  selector: 'tze-clocks',
  templateUrl: './clocks.component.html',
  styleUrls: ['./clocks.component.scss']
})
export class ClocksComponent implements OnDestroy, OnInit {
  ISO_OPTS = ['ISO', { millisDigits: 3, showDstSymbol: true, showOccurrence: true, showSeconds: true, showUtcOffset: true }];
  ISO_SHORT_OPTS = ['ISO', { millisDigits: 3, showSeconds: true }];
  LOCAL_OPTS = { showDstSymbol: true, showOccurrence: true, showSeconds: true, showUtcOffset: true, twoDigitYear: false };
  MIN_YEAR = '1000';
  MAX_YEAR = '4000';
  window = window;

  private newClockIndex = -1;
  private _running = true;
  private timer: any;

  extraClocks: ExtraClock[];
  latestUtc = new DateTime().taiMillis;
  latestUtcTransition = this.latestUtc + 31536000000; // plus 365 days
  localZone = Timezone.guess();
  selectLocal = false;
  selectedTimezone = DEFAULT_EXTRA_ZONE;
  showAddClockDialog = false;
  systemDiff = 0;
  time = new DateTime().taiSeconds * 1000;

  @ViewChild('clocksScroller', { static: true }) clocksScroller: ElementRef;
  @ViewChild('localClock', { read: ElementRef, static: true }) localClock: ElementRef;

  constructor(
    private app: AppService,
    private api: TzExplorerApi,
    private timePoller: HttpTimePoller
  ) {
    const prefs = app.preferences;

    this.extraClocks = prefs.extraClocks;
    this.running = prefs.runClock;
    this.computeUtcRange();
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

  get gpsForm(): string {
    if (this.time < EARLIEST_GPS)
      return 'Proleptic GPS';
    else
      return 'GPS';
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

        if (!IS_MOBILE)
          setTimeout(() => ((this.localClock.nativeElement as HTMLElement)
            .querySelector('.tbw-dse-wrapper') as HTMLElement)?.focus());
      }

      this.app.updatePreferences({ runClock: newValue });
    }
  }

  updateTime = (): void => {
    const timeInfo = this.timePoller.getTimeInfo();
    const origTime = utToTaiMillis(timeInfo.time, true);
    const excessMillis = origTime % 1000;

    this.time = origTime - excessMillis;
    this.systemDiff = timeInfo.time - Date.now();

    if (this.running)
      this.timer = setTimeout(this.updateTime, 1000 - excessMillis);
  }

  now(): void {
    this.time = new DateTime().taiMillis;
  }

  closeClock(index: number): void {
    this.extraClocks.splice(index, 1);
    this.app.updatePreferences({ extraClocks: this.extraClocks });
  }

  openNewClockDialog(): void {
    this.showAddClockDialog = true;
    this.selectLocal = false;
  }

  createClock(): void {
    this.extraClocks.push({ localFormat: this.selectLocal, zone: this.selectedTimezone });
    this.newClockIndex = this.extraClocks.length - 1;
    this.app.updatePreferences({ extraClocks: this.extraClocks });
  }

  checkIfNewClock(clockIndex: number, elem: HTMLElement): string {
    if (this.newClockIndex === clockIndex) {
      elem.scrollIntoView(false);
      setTimeout(() => this.clocksScroller.nativeElement.scrollTop += 8); // Extra nudge to bring clock fully into view.
      this.newClockIndex = -1;
    }

    return '';
  }

  private computeUtcRange(): void {
    const lastLeap = last(Timezone.getLeapSecondList());
    const date = new DateTime(max(lastLeap?.utcMillis ?? 0, Date.now()), 'UTC').wallTimeSparse;

    this.latestUtc = new DateTime({ y: date.y + 1, m: date.m < 7 ? 1 : 7, d: 1 }, 'UTC').taiMillis;
    this.latestUtcTransition = this.latestUtc + 31536000000; // plus 365 days;
  }
}
