import { Component, OnInit } from '@angular/core';
import { DateTime, Timezone, Transition, ttime } from '@tubular/time';
import { max } from '@tubular/math';

const NMSI = Number.MIN_SAFE_INTEGER;

@Component({
  selector: 'tze-zone-history',
  templateUrl: './zone-history.component.html',
  styleUrls: ['./zone-history.component.scss']
})
export class ZoneHistoryComponent implements OnInit {
  NMSI = NMSI;

  private _selectedTimezone: string;

  time = new DateTime();
  timezone: Timezone;
  transitions: Transition[] | null = [];
  upcomingTransition = NMSI;

  constructor() {
    this.selectedTimezone = Timezone.guess();
  }

  ngOnInit(): void {
    this.scrollToUpcoming();
  }

  get selectedTimezone(): string { return this._selectedTimezone; }
  set selectedTimezone(value: string) {
    if (this._selectedTimezone !== value) {
      const now = Date.now();
      const twentyYearsFromNow = now + 631_152_000_000;

      this._selectedTimezone = value;
      this.timezone = Timezone.getTimezone(value);
      this.time.timezone = this.timezone;
      this.transitions = this.timezone.getAllTransitions()?.reverse().filter(t => t.transitionTime < twentyYearsFromNow);
      this.transitions.forEach(t => t.transitionTime > now && (this.upcomingTransition = t.transitionTime));
      setTimeout(() => this.scrollToUpcoming());
    }
  }

  scrollToUpcoming(): void {
    const transList = document.querySelector('.transition-list') as HTMLElement;
    const upcoming = transList?.querySelector('.upcoming-row') as HTMLElement;

    if (upcoming) {
      upcoming.scrollIntoView(true);
      setTimeout(() => transList.scrollBy(0, -44));
    }
  }

  momentBefore(t: Transition): string {
    return this.momentAfter(t, 1000);
  }

  momentAfter(t: Transition, delta = 0): string {
    if (t.transitionTime === NMSI)
      return '—';

    this.time.utcTimeMillis = t.transitionTime - delta;

    return this.time.format('ddd ' + ttime.DATETIME_LOCAL_SECONDS);
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
    if (t.transitionTime === NMSI && delta !== 0)
      return '—';

    this.time.utcTimeMillis = max(t.transitionTime - delta, -5_364_662_400_000);

    return this.time.format('Z').replace(/-/g, '\u2212');
  }

  dstBefore(t: Transition, asBoolean = false): string | boolean {
    return this.dstAfter(t, asBoolean, 1000);
  }

  dstAfter(t: Transition, asBoolean = false, delta = 0): string | boolean {
    if (t.transitionTime === NMSI && delta !== 0)
      return '—';

    this.time.utcTimeMillis = t.transitionTime - delta;

    if (this.time.dstOffsetSeconds === 0)
      return asBoolean ? false : 'no DST';

    return asBoolean ? true : Timezone.formatUtcOffset(this.time.dstOffsetSeconds).replace(/-/g, '\u2212');
  }

  dstAfterStyle(t: Transition): string {
    if (t.dstOffset < 0)
      return 'negative-dst';
    else if (t.dstOffset !== 0 && t.dstOffset !== 3600)
      return 'irregular-dst';
    else
      return undefined;
  }

  abbreviationAfter(t: Transition): string {
    this.time.utcTimeMillis = max(t.transitionTime, -5_364_662_400_000);

    return this.time.format('z');
  }

  getRowMessage(t: Transition): string {
    if (t.deltaOffset > 7200)
      return 'Large transition: ' + Timezone.formatUtcOffset(t.deltaOffset);
    else if (t.deltaOffset % 900 !== 0)
      return 'Irregular transition: ' + Timezone.formatUtcOffset(t.deltaOffset);
    else if (t.deltaOffset === 0 && t.transitionTime !== NMSI)
      return 'Transition with no UTC offset change ';
    else
      return '';
  }
}
