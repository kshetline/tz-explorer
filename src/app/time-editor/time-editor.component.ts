import { ChangeDetectorRef, Component, forwardRef, Input, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DateAndTime, DateTime, DateTimeField, Timezone } from '@tubular/time';
import { abs, div_tt0, max, min } from '@tubular/math';
import { clone, compareCaseInsensitive, isAndroid, isArray, isChrome, isEqual, isIOS, isString, noop, padLeft, toBoolean } from '@tubular/util';
import { timer } from 'rxjs';
import { BACKGROUND_ANIMATIONS, DigitSequenceEditorComponent, FORWARD_TAB_DELAY, SequenceItemInfo } from '../digit-sequence-editor/digit-sequence-editor.component';

export enum DateFieldOrder { PER_LOCALE, YMD, DMY, MDY }
export enum DateTimeStyle { DATE_AND_TIME, DATE_ONLY, TIME_ONLY }
export enum HourStyle { PER_LOCALE, HOURS_24, AM_PM }
export enum YearStyle { POSITIVE_ONLY, AD_BC, SIGNED }

export interface TimeEditorOptions {
  dateFieldOrder?: DateFieldOrder;
  dateFieldSeparator?: string;
  dateTimeSeparator?: string;
  dateTimeStyle?: DateTimeStyle;
  hourStyle?: HourStyle | string[];
  leapSeconds?: boolean;
  locale?: string | string[];
  millisDigits?: number;
  showDstSymbol?: boolean;
  showOccurrence?: boolean;
  showSeconds?: boolean;
  showUtcOffset?: boolean;
  timeFieldSeparator?: string;
  timeFirst?: string;
  twoDigitYear?: boolean;
  yearStyle?: YearStyle | string[];
}

const OCC2 = '\u200A\u2082\u200A';
const NO_BREAK_SPACE = '\u00A0';
const platformNativeDateTime = (isIOS() || (isAndroid() && isChrome()));

export const OPTIONS_ISO: TimeEditorOptions = {
  hourStyle: HourStyle.HOURS_24,
  dateFieldOrder: DateFieldOrder.YMD,
  dateFieldSeparator: '-',
  dateTimeSeparator: NO_BREAK_SPACE,
  leapSeconds: true,
  showDstSymbol: true,
  showOccurrence: true,
  showSeconds: true,
  showUtcOffset: true,
  timeFieldSeparator: ':',
  yearStyle: YearStyle.SIGNED
};

const TIME_EDITOR_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => TimeEditorComponent),
  multi: true
};

type TimeFormat = 'date' | 'time' | 'datetime-local';

const repeat = (n: number, f: Function): void => { while (n-- > 0) f(); };

function convertDigits(n: string): string {
  return n.replace(/[\u0660-\u0669]/g, ch => String.fromCodePoint(ch.charCodeAt(0) - 0x0630)) // Arabic digits
    .replace(/[\u06F0-\u06F9]/g, ch => String.fromCodePoint(ch.charCodeAt(0) - 0x06C0)) // Urdu/Persian digits
    .replace(/[\u0966-\u096F]/g, ch => String.fromCodePoint(ch.charCodeAt(0) - 0x0936)) // Devanagari digits
    .replace(/[\u09E6-\u09EF]/g, ch => String.fromCodePoint(ch.charCodeAt(0) - 0x09B6)) // Bengali digits
    .replace(/[\u0F20-\u0F29]/g, ch => String.fromCodePoint(ch.charCodeAt(0) - 0x0EF0)) // Tibetan digits
    .replace(/[\u1040-\u1049]/g, ch => String.fromCodePoint(ch.charCodeAt(0) - 0x1010)); // Myanmar digits
}

@Component({
  selector: 'tz-time-editor',
  animations: [BACKGROUND_ANIMATIONS],
  templateUrl: '../digit-sequence-editor/digit-sequence-editor.component.html',
  styleUrls: ['../digit-sequence-editor/digit-sequence-editor.component.scss', './time-editor.component.scss'],
  providers: [TIME_EDITOR_VALUE_ACCESSOR]
})
export class TimeEditorComponent extends DigitSequenceEditorComponent implements ControlValueAccessor, OnInit {
  static get supportsNativeDateTime(): boolean { return platformNativeDateTime; }

  private amPmKeys = ['a', 'p'];
  private amPmStrings = ['AM', 'PM'];
  private dateTime = new DateTime();
  private eraKeys = ['b', 'a'];
  private eraStrings = ['BC', 'AD'];
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
  private _options: TimeEditorOptions = {};
  private readonly originalMinYear: number;
  private _tai = false;

  private eraIndex = -1;
  private signIndex = -1;
  private yearIndex = -1;
  private monthIndex = -1;
  private dayIndex = -1;
  private hourIndex = -1;
  private minuteIndex = -1;
  private secondIndex = -1;
  private millisIndex = -1;
  private amPmIndex = -1;
  private occIndex = -1;
  private offsetIndex = -1;
  private dstIndex = -1;

  localTimeFormat: TimeFormat = 'datetime-local';
  localTimeMin: string;
  localTimeMax: string;

  get options(): TimeEditorOptions | string { return this._options; }
  @Input() set options(newValue: TimeEditorOptions | string) {
    if (isString(newValue)) {
      if (compareCaseInsensitive(newValue, 'iso') === 0)
        newValue = OPTIONS_ISO;
      else
        newValue = {};
    }

    if (!isEqual(this._options, newValue)) {
      this._options = newValue;
      this.createDigits();
    }
  }

  get tai(): boolean | string { return this._tai; }
  @Input() set tai(newValue: boolean | string) {
    if (isString(newValue))
      newValue = toBoolean(newValue, false, true);

    if (this._tai !== newValue) {
      this._tai = newValue;
      this.doChangeCallback();
    }
  }

  constructor(private cd: ChangeDetectorRef) {
    super();
    this.useAlternateTouchHandling = false;
    this.originalMinYear = this.minYear = -9999;
    this.maxYear = 9999;
  }

  get value(): number { return this._tai ? this.dateTime.taiMillis : this.dateTime.utcMillis; }
  set value(newValue: number) {
    this.setValue(newValue, true);
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

          newTime = new DateTime({ y: d[0], m: d[1], d: d[2], hrs: d[3], min: d[4], sec: 0 }, this.timezone, this._gregorianChangeDate).utcMillis;
        }
        else if (($ = /(\d\d):(\d\d)/.exec(newValue))) {
          const t = $.slice(1).map(n => Number(n));

          newTime = new DateTime({ y: w.y, m: w.m, d: w.d, hrs: t[0], min: t[1], sec: 0 }, this.timezone, this._gregorianChangeDate).utcMillis;
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
    this.setValue(newValue);
  }

  private setValue(newValue: number, doCallback = false): void {
    let tai = this._tai;

    if (newValue as any instanceof DateTime) {
      tai = true;
      newValue = (newValue as any as DateTime).taiMillis;
    }
    else if (newValue as any instanceof Date) {
      tai = false;
      newValue = (newValue as any as Date).getTime();
    }
    else if (isString(newValue)) {
      tai = true;
      newValue = new DateTime(newValue as any as string, this.dateTime.timezone, this.dateTime.locale, this.dateTime.getGregorianChange()).taiMillis;
    }

    if ((tai && this.dateTime.taiMillis !== newValue) || (!tai && this.dateTime.utcMillis !== newValue)) {
      if (tai)
        this.dateTime.taiMillis = newValue;
      else
        this.dateTime.utcMillis = newValue;

      this.updateDigits();

      if (doCallback)
        this.doChangeCallback();
    }
  }

  private doChangeCallback(): void {
    this.onChangeCallback(this._tai ? this.dateTime.taiMillis : this.dateTime.utcMillis);
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

  get timezone(): Timezone | string { return this.dateTime.timezone; }
  @Input() set timezone(newZone: Timezone | string) {
    if (this.dateTime.timezone !== newZone) {
      this.dateTime.timezone = newZone as any;
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
          this.doChangeCallback();
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
    this.items.length = 0;
    this.eraIndex = -1;
    this.signIndex = -1;
    this.yearIndex = -1;
    this.monthIndex = -1;
    this.dayIndex = -1;
    this.hourIndex = -1;
    this.minuteIndex = -1;
    this.secondIndex = -1;
    this.millisIndex = -1;
    this.amPmIndex = -1;
    this.occIndex = -1;
    this.offsetIndex = -1;
    this.dstIndex = -1;

    const steps: string[] = [];
    const dateSteps: string[] = [];
    const timeSteps: string[] = [];
    const hasDate = (this._options.dateTimeStyle !== DateTimeStyle.TIME_ONLY);
    const hasTime = (this._options.dateTimeStyle !== DateTimeStyle.DATE_ONLY);
    const locale = this._options.locale;
    let ds = '/';
    let ts = ':';

    if (hasDate) {
      if (this._options.yearStyle === YearStyle.SIGNED)
        dateSteps.push('sign');

      const sampleDate = new DateTime('3333-11-22Z', 'UTC', locale).format('l');
      let dfo = this._options.dateFieldOrder ?? DateFieldOrder.PER_LOCALE;

      ds = this._options.dateFieldSeparator || convertDigits(sampleDate).replace(/(^\D+)|[\d\s\u2000-\u200F]/g, '').charAt(0) || '/';

      if (dfo === DateFieldOrder.PER_LOCALE) {
        if (/3.*1.*2/.test(sampleDate))
          dfo = DateFieldOrder.YMD;
        else if (/2.*1.*3/.test(sampleDate))
          dfo = DateFieldOrder.DMY;
        else
          dfo = DateFieldOrder.MDY;
      }

      switch (dfo) {
        case DateFieldOrder.YMD: dateSteps.push('year', 'ds', 'month', 'ds', 'day'); break;
        case DateFieldOrder.DMY: dateSteps.push('day', 'ds', 'month', 'ds', 'year'); break;
        default: dateSteps.push('month', 'ds', 'day', 'ds', 'year');
      }

      if (this._options.yearStyle === YearStyle.AD_BC || isArray(this._options.yearStyle)) {
        dateSteps.push('era');

        if (isArray(this._options.yearStyle))
          this.eraStrings = clone(this._options.yearStyle);
        else {
          const bc = new DateTime('-0001-01-01', 'UTC', locale).format('N');
          const ad = new DateTime(0, 'UTC', locale).format('N');

          this.eraStrings = [bc, ad];
        }

        this.eraKeys = ['b', 'a'];
        const eras = this.eraStrings;

        for (let i = 0; i < eras[0].length && eras[1].length; ++i) {
          if (eras[0].charAt(i) !== eras[1].charAt(i)) {
            this.eraKeys = [eras[0].charAt(i).toLocaleLowerCase(locale), eras[1].charAt(i).toLocaleLowerCase(locale)];
            break;
          }
        }
      }
    }

    if (hasTime) {
      const sampleTime = new DateTime(0, 'UTC', locale).format('LT');

      ts = this._options.timeFieldSeparator || convertDigits(sampleTime).replace(/(^\D+)|[\d\s\u2000-\u200F]/g, '').charAt(0) || ':';
      timeSteps.push('hour', 'ts', 'minute');

      if (this._options.showSeconds || this._options.millisDigits > 0)
        timeSteps.push('ts', 'second');

      if (this._options.millisDigits > 0)
        timeSteps.push('millis');

      let amPm = false;

      if (this._options.hourStyle == null || this._options.hourStyle === HourStyle.PER_LOCALE ||
          this._options.hourStyle === HourStyle.AM_PM) {
        const am = new DateTime(0, 'UTC', locale).format('A');

        if (this._options.hourStyle === HourStyle.AM_PM || sampleTime.includes(am)) {
          amPm = true;
          this.amPmStrings = [am, new DateTime('1970-01-01T13:00', 'UTC', locale).format('A')];
        }
      }
      else if (isArray(this._options.hourStyle)) {
        amPm = true;
        this.amPmStrings = clone(this._options.hourStyle ?? ['AM', 'PM']);
      }

      if (amPm) {
        timeSteps.push('amPm');
        this.amPmKeys = [];
        const aps = this.amPmStrings;

        for (let i = 0; i < aps[0].length && aps[1].length; ++i) {
          if (aps[0].charAt(i) !== aps[1].charAt(i)) {
            this.amPmKeys = [aps[0].charAt(i).toLocaleLowerCase(locale), aps[1].charAt(i).toLocaleLowerCase(locale)];
            break;
          }
        }
      }

      if (this._options.showOccurrence)
        timeSteps.push('occ');

      if (this._options.showUtcOffset)
        timeSteps.push('off');

      if (this._options.showDstSymbol)
        timeSteps.push('dst');
    }

    if (this._options.timeFirst && hasTime && hasDate)
      steps.push(...timeSteps, 'dts', ...dateSteps);
    else {
      if (hasDate)
        steps.push(...dateSteps);

      if (hasTime) {
        if (hasDate)
          steps.push('dts');

        steps.push(...timeSteps);
      }
    }

    const addDigits = (n: number): void => repeat(n, () => this.items.push({ value: 0, editable: true }));

    for (const step of steps) {
      const i = this.items.length;

      switch (step) {
        case 'year': this.yearIndex = i; addDigits(4); break;
        case 'era':
          this.items.push({ value: NO_BREAK_SPACE, static: true, width: '0.25em' });
          this.eraIndex = i + 1;
          this.items.push({ value: this.eraStrings[1], editable: true, sizer: this.eraStrings.join('\n') });
          break;
        case 'sign':
          this.signIndex = i;
          this.items.push({ value: NO_BREAK_SPACE, editable: true, monospaced: true, sizer: '-' });
          break;
        case 'ds': this.items.push({ value: ds, static: true }); break;
        case 'month': this.monthIndex = i; addDigits(2); break;
        case 'day': this.dayIndex = i; addDigits(2); break;
        case 'dts': this.items.push({ value: NO_BREAK_SPACE, static: true, width: '0.6em' }); break;
        case 'hour': this.hourIndex = i; addDigits(2); break;
        case 'amPm':
          this.items.push({ value: NO_BREAK_SPACE, static: true, width: '0.25em' });
          this.amPmIndex = i + 1;
          this.items.push({ value: this.amPmStrings[0], editable: true, sizer: this.amPmStrings.join('\n') });
          break;
        case 'ts': this.items.push({ value: ts, static: true }); break;
        case 'minute': this.minuteIndex = i; addDigits(2); break;
        case 'second': this.secondIndex = i; addDigits(2); break;
        case 'occ':
          this.occIndex = i;
          this.items.push({ value: NO_BREAK_SPACE, sizer: OCC2, name: '2occ' });
          break;
        case 'off':
          this.offsetIndex = i;
          this.items.push({ value: '+00:00', indicator: true, monospaced: true });
          break;
        case 'dst':
          this.dstIndex = i;
          this.items.push({ value: NO_BREAK_SPACE, indicator: true, sizer: '^\n§\n#\n~\n\u2744' });
          break;
      }
    }

    if (steps.includes('second'))
      this.selection = this.secondIndex + 1;
    else if (steps.includes('minute'))
      this.selection = this.minuteIndex + 1;
    else if (steps.includes('day'))
      this.selection = this.dayIndex + 1;

    this.items.push({ divider: true });
    this.items.push({ spinner: true });

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
    let j: number;

    if (!dateTime.valid)
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
        this.doChangeCallback();
        this.updateDigits();
      });
      return;
    }

    let y = abs(wallTime.y);

    if (this.eraIndex >= 0)
      i[this.eraIndex][value] = this.eraStrings[wallTime.y < 1 ? 0 : 1];
    else if (this.signIndex >= 0)
      i[this.signIndex][value] = (wallTime.y < 0 ? '-' : NO_BREAK_SPACE);

    if (this.yearIndex >= 0) {
      if (this.eraIndex >= 0 && wallTime.y < 1)
        y = 1 - wallTime.y;

      // noinspection JSSuspiciousNameCombination
      const y4 = div_tt0(y, 1000);
      const y3 = div_tt0(y - y4 * 1000, 100);
      const y2 = div_tt0(y - y4 * 1000 - y3 * 100, 10);
      const y1 = y % 10;

      j = this.yearIndex;
      [i[j][value], i[j + 1][value], i[j + 2][value], i[j + 3][value]] = [y4, y3, y2, y1];
    }

    if (this.monthIndex >= 0) {
      const M2 = div_tt0(wallTime.m, 10);
      const M1 = wallTime.m % 10;

      j = this.monthIndex;
      [i[j][value], i[j + 1][value]] = [M2, M1];
    }

    if (this.dayIndex >= 0) {
      const d2 = div_tt0(wallTime.d, 10);
      const d1 = wallTime.d % 10;

      j = this.dayIndex;
      [i[j][value], i[j + 1][value]] = [d2, d1];
    }

    if (this.hourIndex > 0) {
      let h = wallTime.hrs;

      if (this.amPmIndex >= 0) {
        i[this.amPmIndex][value] = this.amPmStrings[h < 12 ? 0 : 1];
        h = (h === 0 ? 12 : h <= 12 ? h : h - 12);
      }

      const h2 = div_tt0(h, 10);
      const h1 = h % 10;

      j = this.hourIndex;
      [i[j][value], i[j + 1][value]] = [h2, h1];
    }

    if (this.minuteIndex >= 0) {
      const m2 = div_tt0(wallTime.min, 10);
      const m1 = wallTime.min % 10;

      j = this.minuteIndex;
      [i[j][value], i[j + 1][value]] = [m2, m1];
    }

    if (this.secondIndex >= 0) {
      const s2 = div_tt0(wallTime.sec, 10);
      const s1 = wallTime.sec % 10;

      j = this.secondIndex;
      [i[j][value], i[j + 1][value]] = [s2, s1];
    }

    if (this.occIndex >= 0)
      i[this.occIndex][value] = (wallTime.occurrence === 2 ? OCC2 : NO_BREAK_SPACE);

    if (this.offsetIndex >= 0)
      i[this.offsetIndex][value] = dateTime.timezone.getFormattedOffset(dateTime.utcMillis);

    if (this.dstIndex >= 0) {
      if (!wallTime.dstOffset)
        i[this.dstIndex][value] = NO_BREAK_SPACE;
      else {
        i[this.dstIndex][value] = Timezone.getDstSymbol(wallTime.dstOffset);
      }
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
    const yi = this.yearIndex;
    const Mi = this.monthIndex;
    const di = this.dayIndex;
    const hi = this.hourIndex;
    const mi = this.minuteIndex;
    const si = this.secondIndex;
    let year = <number> i[yi].value * 1000 + <number> i[yi + 1].value * 100 + <number> i[yi + 2].value * 10 + <number> i[yi + 3].value;

    if (this.eraIndex >= 0 && i[this.eraIndex].value === this.eraStrings[0])
      year = 1 - year;
    else if (this.signIndex >= 0 && i[this.signIndex].value === '-')
      year *= -1;

    const month  = <number> i[Mi].value * 10 + <number> i[Mi + 1].value;
    const date   = <number> i[di].value * 10 + <number> i[di + 1].value;
    let   hour   = <number> i[hi].value * 10 + <number> i[hi + 1].value;
    const minute = <number> i[mi].value * 10 + <number> i[mi + 1].value;
    let   second = 0;

    if (this.secondIndex >= 0)
      second = <number> i[si].value * 10 + <number> i[si + 1].value;

    if (this.amPmIndex >= 0) {
      if (i[this.amPmIndex].value === this.amPmStrings[0])
        hour = (hour === 12 ? 0 : min(hour, 12));
      else if (hour !== 12)
        hour = min(hour + 12, 23);
    }

    return { y: year, m: month, d: date, hrs: hour, min: minute, sec: second, occurrence: this.dateTime.wallTime.occurrence };
  }

  createSwipeValues(index: number): void {
    this.roll(1, index, false);
    this.roll(-1, index, false);

    for (let i = 0; i < this.items.length; ++i) {
      const item = this.items[i];

      if (i === index || item.divider || item.static)
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
    const leap = !!this._options.leapSeconds;
    let change = 0;
    let field = DateTimeField.YEAR;
    let wallTime = this.dateTime.wallTime;
    const wasNegative = (this.items[this.signIndex]?.value === '-');

    if (this.eraIndex >= 0 && sel === this.eraIndex) {
      const newYear = 1 - wallTime.y;

      if (newYear < this.minYear || newYear > this.maxYear) {
        if (updateTime)
          this.errorFlash();

        return;
      }

      change = sign * (newYear - wallTime.y);
    }
    else if (this.signIndex >= 0 && sel === this.signIndex) { // Sign of year
      if (-wallTime.y < this.minYear || -wallTime.y > this.maxYear) {
        if (updateTime)
          this.errorFlash();

        return;
      }

      change = -sign * wallTime.y * 2;
    }
    else if (this.secondIndex >= 0 && (sel === this.secondIndex || sel === this.secondIndex + 1)) {
      field = leap ? DateTimeField.SECOND_TAI : DateTimeField.SECOND;
      change = (sel === this.secondIndex ? 10 : 1);
    }
    else if (this.minuteIndex >= 0 && (sel === this.minuteIndex || sel === this.minuteIndex + 1)) {
      field = leap ? DateTimeField.MINUTE_TAI : DateTimeField.MINUTE;
      change = (sel === this.minuteIndex ? 10 : 1);
    }
    else if (this.hourIndex >= 0 && (sel === this.hourIndex || sel === this.hourIndex + 1)) {
      field = leap ? DateTimeField.HOUR_TAI : DateTimeField.HOUR;
      change = (sel === this.hourIndex ? 10 : 1);
    }
    else if (this.amPmIndex >= 0 && sel === this.amPmIndex) {
      field = DateTimeField.HOUR;
      change = (wallTime.hrs < 12 ? 12 : -12) * sign;
    }
    else if (this.dayIndex >= 0 && (sel === this.dayIndex || sel === this.dayIndex + 1)) {
      field = leap ? DateTimeField.DAY_TAI : DateTimeField.DAY;
      change = (sel === this.dayIndex ? 10 : 1);
    }
    else if (this.monthIndex >= 0 && (sel === this.monthIndex || sel === this.monthIndex + 1)) {
      field = DateTimeField.MONTH;
      change = (sel === this.monthIndex ? 10 : 1);
    }
    else if (this.yearIndex >= 0 && this.yearIndex <= sel && sel < this.yearIndex + 4) {
      field = DateTimeField.YEAR;
      change = 10 ** (3 + this.yearIndex - sel);
    }

    if (change === 0)
      return;

    dateTime.add(field, change * sign);
    wallTime = dateTime.wallTime;

    if (wallTime.y < this.minYear || wallTime.y > this.maxYear) {
      if (updateTime)
        this.errorFlash();

      return;
    }

    if (updateTime) {
      if (leap || this._tai)
        this.dateTime.taiMillis = dateTime.taiMillis;
      else
        this.dateTime.utcMillis = dateTime.utcMillis;

      this.doChangeCallback();
      this.updateDigits();

      if (sel === this.signIndex && this.dateTime.wallTime.y === 0)
        this.items[sel].value = (wasNegative ? NO_BREAK_SPACE : '-');
    }
    else
      this.updateDigits(dateTime, sign);
  }

  protected onKey(key: string): void {
    const keyLc = key.toLocaleLowerCase(this._options.locale);
    const editable = !this.disabled && !this.viewOnly;

    if (editable &&
        ((this.selection === this.eraIndex && (key === '1' || key === '2' || this.eraKeys.includes(keyLc))) ||
         (this.selection === this.signIndex && ' -+='.includes(key)) ||
         (this.selection === this.amPmIndex && (key === '1' || key === '2' || this.amPmKeys.includes(keyLc)))))
      this.digitTyped(keyLc.charCodeAt(0), keyLc);
    else
      super.onKey(key);
  }

  protected digitTyped(charCode: number, key: string): void {
    const i = this.items;
    const origDate = <number> i[9].value * 10 + <number> i[10].value;
    const sel = this.selection;
    const origValue = i[sel].value;
    let newValue: number | string = origValue;

    if (sel === this.eraIndex) {
      const [bc, ad] = this.eraStrings;

      if (i[this.eraIndex].value === bc && (key === this.eraKeys[1] || key === '1'))
        newValue = ad;
      else if (i[this.eraIndex].value === ad && (key === this.eraKeys[0] || key === '2'))
        newValue = bc;
    }
    else if (sel === this.signIndex) {
      if (' +=-'.indexOf(key) < 0) {
        this.errorFlash();
        return;
      }
      else if (i[this.signIndex].value === '-' && (key === ' ' || key === '+' || key === '='))
        newValue = NO_BREAK_SPACE;
      else if (i[this.signIndex].value === NO_BREAK_SPACE && key === '-')
        newValue = '-';
    }
    else if (sel === this.amPmIndex) {
      if (key === '1' || key === this.amPmKeys[0])
        newValue = this.amPmStrings[0];
      else if (key === '2' || key === this.amPmKeys[1])
        newValue = this.amPmStrings[1];
      else {
        this.errorFlash();
        return;
      }
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

      if (sel === this.monthIndex)
        wallTime.m = min(max(wallTime.m, 1), 12);

      if (sel === this.dayIndex)
        wallTime.d = min(max(wallTime.d, 1), 31);

      if (sel === this.hourIndex)
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
      this.doChangeCallback();
      this.updateDigits();

      if (sel === this.signIndex && this.dateTime.wallTime.y === 0)
        this.items[sel].value = newValue;
    }

    this.cursorRight();
  }

  getColorForItem(item?: SequenceItemInfo, index?: number): string {
    // Turn hour offset indicator red for bad timezone
    if (index === 18 && (this.timezone as Timezone).error)
      return '#C00';
    else
      return super.getColorForItem(item, index);
  }
}
