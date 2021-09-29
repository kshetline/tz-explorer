import { Component, Input, OnInit } from '@angular/core';
import { DateTime, Timezone, Transition } from '@tubular/time';
import { abs, max } from '@tubular/math';

const NMSI = Number.MIN_SAFE_INTEGER;

interface TransitionExt extends Transition {
  abbr?: string;
  after?: string;
  before?: string;
  dstAfterState?: boolean;
  dstAfterText?: string;
  dstBeforeState?: boolean;
  dstBeforeText?: string;
  gapMessage?: string;
  offsetAfter?: string;
  offsetBefore?: string;
  rowMessage?: string;
}

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
  transitions: TransitionExt[] | null = [];
  upcomingTransition = NMSI;

  @Input() hideTransitions = false;

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
      this.transitions?.forEach(t => t.transitionTime > now && (this.upcomingTransition = t.transitionTime));
      setTimeout(() => this.scrollToUpcoming());
    }
  }

  scrollToUpcoming(): void {
    const transList = document.querySelector('.transition-list') as HTMLElement;
    const upcoming = transList?.querySelector('.upcoming-row') as HTMLElement;

    if (upcoming) {
      const height1 = (transList?.querySelector('.header-elem-1') as HTMLElement)?.getBoundingClientRect().height ?? 21;
      const height2 = (transList?.querySelector('.header-elem-2') as HTMLElement)?.getBoundingClientRect().height ?? 21;

      upcoming.scrollIntoView(true);
      setTimeout(() => transList.scrollBy(0, -(height1 + height2 + 4)));
    }
  }

  momentBefore(t: TransitionExt): string {
    return t.before ?? (t.before = this.moment(t, 1000));
  }

  momentAfter(t: TransitionExt): string {
    return t.after ?? (t.after = this.moment(t, 0));
  }

  private moment(t: Transition, delta: number): string {
    if (t.transitionTime === NMSI)
      return '—';

    this.time.utcTimeMillis = t.transitionTime - delta;

    return this.time.format('ddd YYYY-MM-DD\xA0\xA0\xA0HH:mm:ss');
  }

  getTransitionIcon(t: Transition): string {
    if (t.deltaOffset > 0)
      return 'fa fa-redo';
    else if (t.deltaOffset < 0)
      return 'fa fa-undo';
    else
      return 'far fa-circle';
  }

  offsetBefore(t: TransitionExt): string {
    return t.offsetBefore ?? (t.offsetBefore = this.offset(t, 1000));
  }

  offsetAfter(t: TransitionExt): string {
    return t.offsetAfter ?? (t.offsetAfter = this.offset(t, 0));
  }

  private offset(t: Transition, delta: number): string {
    if (t.transitionTime === NMSI && delta !== 0)
      return '—';

    this.time.utcTimeMillis = max(t.transitionTime - delta, -5_364_662_400_000);

    return this.time.format('Z').replace(/-/g, '\u2212');
  }

  dstBefore(t: TransitionExt, asBoolean = false): string | boolean {
    if (asBoolean)
      return t.dstBeforeState ?? (t.dstBeforeState = this.dstValue(t, true, 1000) as boolean);
    else
      return t.dstBeforeText ?? (t.dstBeforeText = this.dstValue(t, false, 1000) as string);
  }

  dstAfter(t: TransitionExt, asBoolean = false): string | boolean {
    if (asBoolean)
      return t.dstAfterState ?? (t.dstAfterState = this.dstValue(t, true, 0) as boolean);
    else
      return t.dstAfterText ?? (t.dstAfterText = this.dstValue(t, false, 0) as string);
  }

  private dstValue(t: Transition, asBoolean = false, delta: number): string | boolean {
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

  abbreviationAfter(t: TransitionExt): string {
    if (t.abbr != null)
      return t.abbr;
    else if (t.name && !/[-+:]/.test(t.name))
      return (t.abbr = t.name);

    this.time.utcTimeMillis = max(t.transitionTime, -5_364_662_400_000);

    return (t.abbr = this.time.format('z').replace(/-/g, '\u2212'));
  }

  getGapMessage(t1: TransitionExt, index: number): string {
    if (t1.gapMessage != null)
      return t1.gapMessage;
    else if (index > 0 && index < this.transitions.length - 1) {
      const t0 = this.transitions[index - 1];

      if (t0.transitionTime - t1.transitionTime > 31_449_600_000) {
        const y0 = this.time.getTimeOfDayFieldsFromMillis(t0.transitionTime).y;
        const y1 = this.time.getTimeOfDayFieldsFromMillis(t1.transitionTime).y;

        if (y0 - y1 === 2)
          t1.gapMessage = `No transitions during year ${y1 + 1}`;
        else if (y0 - y1 > 2)
          t1.gapMessage = `No transitions during years ${y1 + 1}-${y0 - 1}`;
      }
      else
        t1.gapMessage = '';
    }

    return t1.gapMessage;
  }

  getRowMessage(t: TransitionExt): string {
    if (t.rowMessage != null)
      return t.rowMessage;
    else if (abs(t.deltaOffset) > 7200)
      t.rowMessage = 'Large transition: ' + Timezone.formatUtcOffset(t.deltaOffset);
    else if (t.deltaOffset % 900 !== 0)
      t.rowMessage = 'Irregular transition: ' + Timezone.formatUtcOffset(t.deltaOffset);
    else if (t.deltaOffset === 0 && t.transitionTime !== NMSI)
      t.rowMessage = 'Transition with no UTC offset change ';
    else
      t.rowMessage = '';

    return t.rowMessage;
  }
}
