import { ChangeDetectorRef, Component, forwardRef, Input, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DateAndTime, DateTimeField, DateTime, Timezone } from '@tubular/time';
import { abs, div_tt0, max, min } from '@tubular/math';
import { isAndroid, isChrome, isIOS, noop, padLeft } from '@tubular/util';
import { timer } from 'rxjs';
import { BACKGROUND_ANIMATIONS, FORWARD_TAB_DELAY, DigitSequenceEditorComponent, SequenceItemInfo } from '../digit-sequence-editor/digit-sequence-editor.component';

export enum DateFieldOrder { YMD, DMY, MDY, PER_LOCALE }
export enum DateTimeStyle { DATE_AND_TIME, DATE_ONLY, TIME_ONLY }
export enum HourStyle { HOURS_24, AM_PM, PER_LOCALE }
export enum YearStyle { POSITIVE_ONLY, AD_BC, SIGNED }

export interface TimeEditorOptions {
  amPm?: HourStyle | string[];
  dateFieldOrder?: DateFieldOrder;
  dateFieldSeparator?: string;
  dateTimeSeparator?: string;
  dateTimeStyle?: DateTimeStyle;
  locale?: string | string[];
  millisDigits?: number;
  showDstSymbol?: boolean;
  showOccurrence?: boolean;
  showSeconds?: boolean;
  showUtcOffset?: boolean;
  timeFieldSeparator?: string;
  twoDigitYear?: boolean;
  yearStyle?: YearStyle | string[];
}

const TIME_EDITOR_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => TimeEditorComponent),
  multi: true
};

const NO_BREAK_SPACE = '\u00A0';
const platformNativeDateTime = (isIOS() || (isAndroid() && isChrome()));

type TimeFormat = 'date' | 'time' | 'datetime-local';

@Component({
  selector: 'tz-time-editor',
  animations: [BACKGROUND_ANIMATIONS],
  templateUrl: '../digit-sequence-editor/digit-sequence-editor.component.html',
  styleUrls: ['../digit-sequence-editor/digit-sequence-editor.component.scss', './time-editor.component.scss'],
  providers: [TIME_EDITOR_VALUE_ACCESSOR]
})
export class TimeEditorComponent extends DigitSequenceEditorComponent implements ControlValueAccessor, OnInit {
  static get supportsNativeDateTime(): boolean { return platformNativeDateTime; }

  private dateTime = new DateTime();
  private firstTouch = true;
  private hasLocalTimeFocus = false;
  private _gregorianChangeDate = '1582-10-15';
  private localTime: HTMLInputElement;
  private localTimeValue: string;
  private _maxYear: number;
  private _minYear: number;
  private _nativeDateTime = false;
  private onChangeCallback: (_: any) => void = noop;
  private onTouchedCallback: () => void = noop;
  private readonly originalMinYear: number;

  localTimeFormat: TimeFormat = 'datetime-local';
  localTimeMin: string;
  localTimeMax: string;

  constructor(private cd: ChangeDetectorRef) {
    super();
    this.signDigit = 0;
    this.useAlternateTouchHandling = false;
    this.originalMinYear = this.minYear = -9999;
    this.maxYear = 9999;
  }

  get value(): number { return this.dateTime.utcTimeMillis; }
  set value(newTime: number) {
    if (this.dateTime.utcTimeMillis !== newTime) {
      this.dateTime.utcTimeMillis = newTime;
      this.updateDigits();
      this.onChangeCallback(newTime);
    }
  }

  onLocalTimeChange(): void {
    const newValue = this.localTime.value;

    if (this.localTimeValue !== newValue) {
      this.localTimeValue = newValue;

      let newTime: number;

      if (newValue) {
        const w = this.dateTime.wallTime;
        let $;

        if (($ = /(\d\d\d\d)-(\d\d)-(\d\d)(?:T(\d\d):(\d\d))?/.exec(newValue))) {
          const d = $.slice(1).map(n => Number(n));

          if ($[4] == null) {
            d[3] = w.hrs;
            d[4] = w.min;
          }

          newTime = new DateTime({ y: d[0], m: d[1], d: d[2], hrs: d[3], min: d[4], sec: 0 }, this.timezone, this._gregorianChangeDate).utcTimeMillis;
        }
        else if (($ = /(\d\d):(\d\d)/.exec(newValue))) {
          const t = $.slice(1).map(n => Number(n));

          newTime = new DateTime({ y: w.y, m: w.m, d: w.d, hrs: t[0], min: t[1], sec: 0 }, this.timezone, this._gregorianChangeDate).utcTimeMillis;
        }
      }
      else
        newTime = Date.now();

      if (newTime !== undefined && !isNaN(newTime))
        this.value = newTime;

      if (!this.localTimeValue)
        setTimeout(() => this.updateLocalTime());
    }
  }

  ngOnInit(): void {
    super.ngOnInit();
    this.createLocalTimeInput();
    this.localTime?.setAttribute('tabindex', this.useAlternateTouchHandling ? this.tabindex : '-1');
  }

  onLocalTimeFocus(value: boolean): void {
    if (value && this.viewOnly || this.initialNativeDateTimePrompt())
      return;

    if (this.hasLocalTimeFocus !== value) {
      this.hasLocalTimeFocus = value;
      this.checkFocus();
    }
  }

  private createLocalTimeInput(): void {
    if (!platformNativeDateTime)
      return;

    this.localTime = document.createElement('input');
    this.localTime.type = this.localTimeFormat;
    this.localTime.autocomplete = 'off';
    this.localTime.setAttribute('autocapitalize', 'off');
    this.localTime.setAttribute('autocomplete', 'off');
    this.localTime.setAttribute('autocorrect', 'off');
    this.localTime.setAttribute('tabindex', this.disabled ? '-1' : this.tabindex);
    this.localTime.setAttribute('min', this.localTimeMin);
    this.localTime.setAttribute('max', this.localTimeMax);
    this.localTime.style.position = 'absolute';
    this.localTime.style.opacity = '0';
    (this.localTime.style as any)['caret-color'] = 'transparent';
    (this.localTime.style as any)['pointer-events'] = 'none';
    this.localTime.style.left = '0';
    this.localTime.style.top = '-6px';

    this.localTime.addEventListener('focus', () => this.onLocalTimeFocus(true));
    this.localTime.addEventListener('blur', () => this.onLocalTimeFocus(false));
    this.localTime.addEventListener('input', () => this.onLocalTimeChange());

    this.wrapper.parentElement.appendChild(this.localTime);
    this.wrapper.setAttribute('tabindex', '-1');
  }

  protected hasAComponentInFocus(): boolean {
    return super.hasAComponentInFocus() || this.hasLocalTimeFocus;
  }

  protected checkFocus(): void {
    if (this.initialNativeDateTimePrompt())
      return;

    super.checkFocus();
  }

  protected gainedFocus(): void {
    if (this.initialNativeDateTimePrompt())
      return;

    if (!this.hasLocalTimeFocus && this.isNativeDateTimeActive() && performance.now() > this.lastTabTime + FORWARD_TAB_DELAY)
      this.localTime?.focus();
  }

  protected lostFocus(): void {
    this.onTouchedCallback();
  }

  protected adjustState(): void {
    super.adjustState();

    this.localTime?.setAttribute('disabled',
        this.disabled || this.viewOnly || !this.useAlternateTouchHandling ? '' : null);
    this.localTime?.setAttribute('tabindex', this.disabled ? '-1' : this.tabindex);
  }

  onTouchStart(index: number, evt: TouchEvent): void {
    if (!this.initialNativeDateTimePrompt(evt))
      super.onTouchStart(index, evt);
  }

  onTouchMove(evt: TouchEvent): void {
    if (!this.nativeDateTime)
      super.onTouchMove(evt);
  }

  protected initialNativeDateTimePrompt(evt?: Event): boolean {
    if (TimeEditorComponent.supportsNativeDateTime && this.promptForNative &&
        !this.disabled && !this.viewOnly && this.firstTouch) {
      this.firstTouch = false;

      if (this.promptForNative && this.promptForNative()) {
        if (evt)
          evt.preventDefault();

        return true;
      }
    }

    return false;
  }

  protected onTouchStartAlternate(index: number, _event: TouchEvent): void {
    let format: TimeFormat = 'datetime-local';

    if (isIOS())
      format = (index >= 0 && index < 11 ? 'date' : 'time');

    if (this.localTimeFormat !== format) {
      // Changing the format of the input (using the "type" attribute) sets off a number of updates
      // that don't stabilize very well if we leave it up to Angular's change detection process to do
      // all of the updating, so we'll update all of the changing input attributes and input value
      // directly, all in one go.
      this.localTimeFormat = format;
      this.adjustLocalTimeMin();
      this.adjustLocalTimeMax();
      this.updateLocalTime();
      this.localTime.type = format;
      this.localTime.min = this.localTimeMin;
      this.localTime.max = this.localTimeMax;
      this.localTime.value = this.localTimeValue;
      this.cd.detectChanges();
    }

    this.localTime.focus();
    setTimeout(() => this.localTime.click(), 250);
  }

  writeValue(newValue: number): void {
    if (this.dateTime.utcTimeMillis !== newValue) {
      this.dateTime.utcTimeMillis = newValue;
      this.updateDigits();
    }
  }

  registerOnChange(fn: any): void {
    this.onChangeCallback = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouchedCallback = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.displayState = (isDisabled ? 'disabled' : (this.viewOnly ? 'viewOnly' : 'normal'));
  }

  get minYear(): number { return this._minYear; }
  @Input() set minYear(year: number) {
    if (this._minYear !== year) {
      this._minYear = year;
      this.adjustLocalTimeMin();
    }
  }

  private adjustLocalTimeMin(): void {
    if (this.localTimeFormat === 'time')
      this.localTimeMin = null;
    else
      this.localTimeMin = padLeft(max(this._minYear, 1), 4, '0') + '-01-01' + (this.localTimeFormat === 'date' ? '' : 'T00:00');

    this.localTime?.setAttribute('min', this.localTimeMin);
  }

  get maxYear(): number { return this._maxYear; }
  @Input() set maxYear(year: number) {
    if (this._maxYear !== year) {
      this._maxYear = year;
      this.adjustLocalTimeMax();
    }
  }

  private adjustLocalTimeMax(): void {
    if (this.localTimeFormat === 'time')
      this.localTimeMax = null;
    else
      this.localTimeMax = padLeft(this._maxYear, 4, '0') + '-12-31' + (this.localTimeFormat === 'date' ? '' : 'T23:59');

    this.localTime?.setAttribute('max', this.localTimeMax);
  }

  get timezone(): Timezone { return this.dateTime.timezone; }
  @Input() set timezone(newZone: Timezone) {
    if (this.dateTime.timezone !== newZone) {
      this.dateTime.timezone = newZone;
      this.updateDigits();
    }
  }

  // eslint-disable-next-line accessor-pairs
  @Input() set gregorianChangeDate(value: string) {
    if (this._gregorianChangeDate !== value) {
      this._gregorianChangeDate = value;
      this.dateTime.setGregorianChange(value);
      this.updateDigits();
    }
  }

  @Input() promptForNative: () => boolean;

  get nativeDateTime(): boolean { return this._nativeDateTime; }
  @Input() set nativeDateTime(newValue: boolean) {
    if (this._nativeDateTime !== newValue) {
      this._nativeDateTime = newValue;
      this.useAlternateTouchHandling = this.selectionHidden = newValue && TimeEditorComponent.supportsNativeDateTime;

      if (this.hiddenInput)
        this.hiddenInput.disabled = !!this.disabled || this.useAlternateTouchHandling;

      if (this.localTime && TimeEditorComponent.supportsNativeDateTime)
        this.localTime.setAttribute('tabindex', newValue ? '0' : '-1');

      if (newValue) {
        let wallTime = this.dateTime.wallTime;

        this.minYear = max(this.originalMinYear, 1);

        if (wallTime.y < this.minYear) {
          wallTime = { y: this.minYear, m: 1, d: 1, hrs: 0, min: 0, sec: 0 };
          this.dateTime.wallTime = wallTime;
          this.onChangeCallback(this.dateTime.utcTimeMillis);
          this.updateDigits();
        }
      }
      else
        this.minYear = this.originalMinYear;

      this.cd.detectChanges();
    }
  }

  isNativeDateTimeActive(): boolean {
    return DigitSequenceEditorComponent.touchHasOccurred && this.nativeDateTime && TimeEditorComponent.supportsNativeDateTime;
  }

  protected createHiddenInput(): void {
    super.createHiddenInput();

    if (this.hiddenInput)
      this.hiddenInput.disabled = !!this.disabled || this.useAlternateTouchHandling;
  }

  protected createDigits(): void {
    this.items.push({ value: NO_BREAK_SPACE, editable: true, monospaced: true, emWidth: 0.6 }); //  0 - Year sign
    this.items.push({ value: 0,   editable: true }); //  1 - Year thousands
    this.items.push({ value: 0,   editable: true }); //  2 - Year hundreds
    this.items.push({ value: 0,   editable: true }); //  3 - Year tens
    this.items.push({ value: 0,   editable: true }); //  4 - Year units
    this.items.push({ value: '-', static: true });
    this.items.push({ value: 0,   editable: true }); //  6 - Month tens
    this.items.push({ value: 0,   editable: true }); //  7 - Month units
    this.items.push({ value: '-', static: true });
    this.items.push({ value: 0,   editable: true }); //  9 - Day tens
    this.items.push({ value: 0,   editable: true }); // 10 - Day units
    this.items.push({ value: NO_BREAK_SPACE, static: true, emWidth: 0.6 }); // iOS Safari doesn't render no-break space without forcing explicit width for some odd reason.
    this.items.push({ value: 0,   editable: true }); // 12 - Hour tens
    this.items.push({ value: 0,   editable: true }); // 13 - Hour units
    this.items.push({ value: ':', static: true });
    this.items.push({ value: 0,   editable: true }); // 15 - Minute tens
    this.items.push({ value: 0,   editable: true }); // 16 - Minute units
    this.items.push({ value: NO_BREAK_SPACE, editable: false, selected: false, emWidth: 0.4, name: '2occ' }); // 17 - 2nd occurrence indicator (Subscript 2, hair space)
    this.items.push({ value: '+00:00', editable: false, selected: false, indicator: true, monospaced: true }); // 18 - UTC offset
    this.items.push({ value: NO_BREAK_SPACE, editable: false, selected: false, indicator: true, monospaced: true }); // 19 - DST indicator
    this.items.push({ divider: true });
    this.items.push({ spinner: true });
    this.selection = 16;

    this.updateDigits();
  }

  getFontClassForItem(item: SequenceItemInfo): string {
    if (item?.name === '2occ')
      return 'subscript';
    else
      return super.getFontClassForItem(item);
  }

  private updateDigits(dateTime = this.dateTime, delta = 0): void {
    const i = this.items as any[];
    const value = delta === 0 ? 'value' : delta < 0 ? 'swipeBelow' : 'swipeAbove';

    if (i.length < 17 || !dateTime.valid)
      return;

    let wallTime = dateTime.wallTime;
    let reUpdate = false;

    if (wallTime.y < this.minYear) {
      wallTime = { y: this.minYear, m: 1, d: 1, hrs: 0, min: 0, sec: 0 };
      reUpdate = true;
    }
    else if (wallTime.y > this.maxYear) {
      wallTime = { y: this.maxYear, m: 12, d: 31, hrs: 23, min: 59, sec: 0 };
      reUpdate = true;
    }

    if (reUpdate && delta === 0) {
      timer().subscribe(() => {
        this.errorFlash();
        dateTime.wallTime = wallTime;
        this.onChangeCallback(dateTime.utcTimeMillis);
        this.updateDigits();
      });
      return;
    }

    const y = abs(wallTime.y);

    if (wallTime.y < 0)
      i[0][value] = '-';
    else
      i[0][value] = NO_BREAK_SPACE;

    // noinspection JSSuspiciousNameCombination
    const y4 = div_tt0(y, 1000);
    const y3 = div_tt0(y - y4 * 1000, 100);
    const y2 = div_tt0(y - y4 * 1000 - y3 * 100, 10);
    const y1 = y % 10;

    [i[1][value], i[2][value], i[3][value], i[4][value]] = [y4, y3, y2, y1];

    const M2 = div_tt0(wallTime.m, 10);
    const M1 = wallTime.m % 10;

    [i[6][value], i[7][value]] = [M2, M1];

    const d2 = div_tt0(wallTime.d, 10);
    const d1 = wallTime.d % 10;

    [i[9][value], i[10][value]] = [d2, d1];

    const h2 = div_tt0(wallTime.hrs, 10);
    const h1 = wallTime.hrs % 10;

    [i[12][value], i[13][value]] = [h2, h1];

    const m2 = div_tt0(wallTime.min, 10);
    const m1 = wallTime.min % 10;

    [i[15][value], i[16][value]] = [m2, m1];
    i[17][value] = (wallTime.occurrence === 2 ? '\u200A\u2082' : NO_BREAK_SPACE);
    i[18][value] = dateTime.timezone.getFormattedOffset(dateTime.utcTimeMillis);

    if (!wallTime.dstOffset)
      i[19][value] = NO_BREAK_SPACE;
    else {
      i[19][value] = Timezone.getDstSymbol(wallTime.dstOffset);
    }

    if (delta === 0)
      this.updateLocalTime();
  }

  private updateLocalTime(): void {
    const w = this.dateTime.wallTime;
    let year = w.y;

    if (this.isNativeDateTimeActive() && year < 1)
      year = 1;

    if (this.localTimeFormat === 'time')
      this.localTimeValue = `${padLeft(w.hrs, 2, '0')}:${padLeft(w.min, 2, '0')}`;
    else
      this.localTimeValue = `${padLeft(year, 4, '0')}-${padLeft(w.m, 2, '0')}-${padLeft(w.d, 2, '0')}` +
        (this.localTimeFormat === 'date' ? '' : `T${padLeft(w.hrs, 2, '0')}:${padLeft(w.min, 2, '0')}`);

    if (this.localTime)
      this.localTime.value = this.localTimeValue;
  }

  private getWallTimeFromDigits(): DateAndTime {
    const i = this.items;
    let year = <number> i[1].value * 1000 + <number> i[2].value * 100 + <number> i[3].value * 10 + <number> i[4].value;

    if (i[0].value === '-')
      year *= -1;

    const month  = <number> i[6].value * 10 + <number> i[7].value;
    const date   = <number> i[9].value * 10 + <number> i[10].value;
    const hour   = <number> i[12].value * 10 + <number> i[13].value;
    const minute = <number> i[15].value * 10 + <number> i[16].value;

    return { y: year, m: month, d: date, hrs: hour, min: minute, sec: 0, occurrence: this.dateTime.wallTime.occurrence };
  }

  createSwipeValues(index: number): void {
    this.roll(1, index, false);
    this.roll(-1, index, false);

    for (let i = 0; i < index; ++i) {
      const item = this.items[i];

      if (item.divider || item.static)
        continue;
      if (item.value === item.swipeAbove && item.value === item.swipeBelow)
        item.swipeAbove = item.swipeBelow = null;
      else if (item.editable)
        break;
    }

    for (let i = this.items.length - 1; i > index; --i) {
      const item = this.items[i];

      if (item.divider || item.static)
        continue;
      if (item.value === item.swipeAbove && item.value === item.swipeBelow)
        item.swipeAbove = item.swipeBelow = null;
      else if (item.editable)
        break;
    }
  }

  protected increment(): void {
    this.roll(1);
  }

  protected decrement(): void {
    this.roll(-1);
  }

  private roll(sign: number, sel = this.selection, updateTime = true): void {
    const dateTime = this.dateTime.clone();
    let change = 0;
    let field = DateTimeField.YEAR;
    let wallTime = this.dateTime.wallTime;
    const wasNegative = (this.items[this.signDigit].value === '-');

    if (sel === this.signDigit) { // Sign of year
      if (-wallTime.y < this.minYear || -wallTime.y > this.maxYear) {
        if (updateTime)
          this.errorFlash();

        return null;
      }

      change = -sign * wallTime.y * 2;
    }
    else if (sel === 16 || sel === 15) {
      field = DateTimeField.MINUTE;
      change = (sel === 15 ? 10 : 1);
    }
    else if (sel === 13 || sel === 12) {
      field = DateTimeField.HOUR;
      change = (sel === 12 ? 10 : 1);
    }
    else if (sel === 10 || sel === 9) {
      field = DateTimeField.DAY;
      change = (sel === 9 ? 10 : 1);
    }
    else if (sel === 7 || sel === 6) {
      field = DateTimeField.MONTH;
      change = (sel === 6 ? 10 : 1);
    }
    else if (sel === 4 || sel === 3 || sel === 2 || sel === 1) {
      field = DateTimeField.YEAR;
      change = (sel === 1 ? 1000 : sel === 2 ? 100 : sel === 3 ? 10 : 1);
    }

    dateTime.add(field, change * sign);
    wallTime = dateTime.wallTime;

    if (wallTime.y < this.minYear || wallTime.y > this.maxYear) {
      if (updateTime)
        this.errorFlash();

      return;
    }

    if (updateTime) {
      this.dateTime.utcTimeMillis = dateTime.utcTimeMillis;
      this.onChangeCallback(this.dateTime.utcTimeMillis);
      this.updateDigits();

      if (sel === this.signDigit && this.dateTime.wallTime.y === 0)
        this.items[sel].value = (wasNegative ? NO_BREAK_SPACE : '-');
    }
    else
      this.updateDigits(dateTime, sign);
  }

  protected onKey(key: string): void {
    if (!this.disabled && !this.viewOnly && this.selection === 0 && key === ' ')
      this.digitTyped(32, ' ');
    else
      super.onKey(key);
  }

  protected digitTyped(charCode: number, key: string): void {
    const i = this.items;
    const origDate = <number> i[9].value * 10 + <number> i[10].value;
    const sel = this.selection;
    const origValue = i[sel].value;
    let newValue: number | string = origValue;

    if (sel === this.signDigit) {
      if (' +=-'.indexOf(key) < 0) {
        this.errorFlash();
        return;
      }
      else if (i[0].value === '-' && (key === ' ' || key === '+' || key === '='))
        newValue = NO_BREAK_SPACE;
      else if (i[0].value === NO_BREAK_SPACE && key === '-')
        newValue = '-';
    }
    else if (48 <= charCode && charCode < 58)
      newValue = charCode - 48;
    else {
      this.errorFlash();
      return;
    }

    if (newValue !== origValue) {
      i[sel].value = newValue;

      const wallTime = this.getWallTimeFromDigits();

      if (wallTime.y < this.minYear || wallTime.y > this.maxYear ||
          wallTime.m > 19 || wallTime.d > 39 ||
          wallTime.hrs > 29 || wallTime.min > 59) {
        i[sel].value = origValue;
        this.errorFlash();
        return;
      }

      if (sel === 6)
        wallTime.m = min(max(wallTime.m, 1), 12);

      if (sel === 9)
        wallTime.d = min(max(wallTime.d, 1), 31);

      if (sel === 12)
        wallTime.hrs = min(wallTime.hrs, 23);

      if (wallTime.m === 0 || wallTime.m > 12 || wallTime.d === 0 || wallTime.hrs > 23) {
        i[sel].value = origValue;
        this.errorFlash();
        return;
      }
      else if (!this.dateTime.isValidDate(wallTime)) {
        const lastDate = this.dateTime.getLastDateInMonth(wallTime.y, wallTime.m);
        // Check for date gaps caused by Julian-to-Gregorian transition, e.g. October 1582
        // having no 5th-14h, with 10/04 followed immediately by 10/15.
        const gap = this.dateTime.getMissingDateRange(wallTime.y, wallTime.m);

        if (gap && gap[0] <= wallTime.d && wallTime.d <= gap[1]) // Mind the gap! Step to either side of it.
          wallTime.d = (origDate > wallTime.d && gap[0] !== 1 ? gap[0] - 1 : min(gap[1] + 1, lastDate));

        if (wallTime.d > lastDate) {
          if ((lastDate < 30 && wallTime.d >= 30 && sel === 9) ||
              (wallTime.d > lastDate && sel === 10)) {
            i[sel].value = origValue;
            this.errorFlash();
            return;
          }

          wallTime.d = lastDate;
        }
      }

      this.dateTime.wallTime = wallTime;
      this.onChangeCallback(this.dateTime.utcTimeMillis);
      this.updateDigits();

      if (sel === this.signDigit && this.dateTime.wallTime.y === 0)
        this.items[sel].value = newValue;
    }

    this.cursorRight();
  }

  getColorForItem(item?: SequenceItemInfo, index?: number): string {
    // Turn hour offset indicator red for bad timezone
    if (index === 18 && this.timezone.error)
      return '#C00';
    else
      return super.getColorForItem(item, index);
  }
}
