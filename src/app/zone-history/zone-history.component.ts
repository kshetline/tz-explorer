import { Component, OnInit } from '@angular/core';
import { DateTime, Timezone, Transition, ttime } from '@tubular/time';
import { max } from '@tubular/math';

@Component({
  selector: 'tze-zone-history',
  templateUrl: './zone-history.component.html',
  styleUrls: ['./zone-history.component.scss']
})
export class ZoneHistoryComponent implements OnInit {
  private _selectedTimezone: string;

  time = new DateTime();
  timezone: Timezone;
  transitions: Transition[] | null = [];

  constructor() {
    this.selectedTimezone = Timezone.guess();
  }

  ngOnInit(): void {
    console.log('');
  }

  get selectedTimezone(): string { return this._selectedTimezone; }
  set selectedTimezone(value: string) {
    if (this._selectedTimezone !== value) {
      const twentyYearsFromNow = Date.now() + 631_152_000_000;

      this._selectedTimezone = value;
      this.timezone = Timezone.getTimezone(value);
      this.time.timezone = this.timezone;
      this.transitions = this.timezone.getAllTransitions()?.reverse().filter(t => t.transitionTime < twentyYearsFromNow);
    }
  }

  momentBefore(t: Transition): string {
    return this.momentAfter(t, 1000);
  }

  momentAfter(t: Transition, delta = 0): string {
    if (t.transitionTime === Number.MIN_SAFE_INTEGER)
      return '—';

    this.time.utcTimeMillis = t.transitionTime - delta;

    return this.time.format(ttime.DATETIME_LOCAL_SECONDS);
  }

  getTransitionIcon(t: Transition): string {
    if (t.deltaOffset > 0)
      return 'fa fa-redo';
    else if (t.deltaOffset < 0)
      return 'fa fa-undo';
    else
      return 'far fa-circle';
  }

  offsetBefore(t: Transition): string {
    return this.offsetAfter(t, 1000);
  }

  offsetAfter(t: Transition, delta = 0): string {
    if (t.transitionTime === Number.MIN_SAFE_INTEGER && delta !== 0)
      return '—';

    this.time.utcTimeMillis = max(t.transitionTime - delta, -5_364_662_400_000);

    return this.time.format('Z');
  }

  dstBefore(t: Transition, asBoolean = false): string | boolean {
    return this.dstAfter(t, asBoolean, 1000);
  }

  dstAfter(t: Transition, asBoolean = false, delta = 0): string | boolean {
    if (t.transitionTime === Number.MIN_SAFE_INTEGER && delta !== 0)
      return '—';

    this.time.utcTimeMillis = t.transitionTime - delta;

    if (this.time.dstOffsetSeconds === 0)
      return asBoolean ? false : 'no DST';

    return asBoolean ? true : Timezone.formatUtcOffset(this.time.dstOffsetSeconds);
  }
}
