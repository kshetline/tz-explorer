import { Component } from '@angular/core';
import {
  CalendarPanelComponent, DateFieldOrder, DateTimeStyle, FormErrorDisplayComponent, HourStyle, MixedTimeEditorOptions,
  TimeEditorComponent, TimeEditorLimit, YearStyle
} from '@tubular/ng-widgets';
import { clone, isArray, isEqual, toNumber } from '@tubular/util';
import { max, Point } from '@tubular/math';
import { DateAndTime, DateTime, Timezone, YMDDate } from '@tubular/time';
import { AppService } from '../app.service';
import { Select } from 'primeng/select';
import { PSelectAutosizerDirective } from '../util/p-select-autosizer.directive';
import { FormsModule } from '@angular/forms';
import { Checkbox } from 'primeng/checkbox';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';

const intl_DisplayNames = (Intl as any).DisplayNames;
const defaultSettings = {
  blank: false,
  customCycle: HourStyle.PER_LOCALE,
  customLocale: '',
  customStyle: DateTimeStyle.DATE_AND_TIME,
  customTimezone: Timezone.guess(),
  darkMode: false,
  dateFieldOrder: DateFieldOrder.PER_LOCALE,
  float: false,
  floatPosition: null as Point,
  iso: false,
  numSystem: '',
  secondsMode: 0,
  showDst: false,
  showOccurrence: false,
  showOffset: false,
  timeDisabled: false,
  viewOnly: false,
  wideSpinner: false,
  yearLength: 0,
  yearStyle: YearStyle.POSITIVE_ONLY
};

@Component({
  selector: 'tze-code',
  templateUrl: './code.component.html',
  styleUrls: ['./code.component.scss'],
  imports: [Select, PSelectAutosizerDirective, FormsModule, Checkbox, ButtonDirective, InputText,
            TimeEditorComponent, FormErrorDisplayComponent, CalendarPanelComponent, FormsModule]
})
export class CodeComponent {
  DATE_ONLY = DateTimeStyle.DATE_ONLY;
  TIME_ONLY = DateTimeStyle.TIME_ONLY;

  private _calendarDate: YMDDate;
  private _customLocale = 'default';
  private _customTimezone = defaultSettings.customTimezone;
  // noinspection TypeScriptFieldCanBeMadeReadonly
  private initDone = false;
  // noinspection JSMismatchedCollectionQueryUpdate
  private lastZones: string[];
  private _max = '';
  private millis = 0;
  private _min = '';
  private _numSystem = 'default';
  private _secondsMode = 0;
  private showSeconds = false;
  private timezoneChoices: any[];
  private updateTimer: any;

  customCycle = HourStyle.PER_LOCALE;
  customStyle = DateTimeStyle.DATE_AND_TIME;
  defaultLocale = DateTime.getDefaultLocale();
  darkMode = true;
  date = new DateTime().toIsoString(10);
  dateFieldOrder = DateFieldOrder.PER_LOCALE;
  float = false;
  floatPosition: Point = null;
  iso = false;
  localeGood = true;
  maxGood = true;
  minGood = true;
  numSystemGood = true;
  showDst = false;
  showOccurrence = false;
  showOffset = false;
  time = new DateTime().taiMillis;
  timeDisabled = false;
  timezoneGood = true;
  viewOnly = true;
  wideSpinner = false;
  yearLength = 0;
  yearStyle = YearStyle.POSITIVE_ONLY;

  cycleChoices = [
    { label: '12/24 hours, per locale', value: HourStyle.PER_LOCALE },
    { label: '24-hour time', value: HourStyle.HOURS_24 },
    { label: 'AM/PM time', value: HourStyle.AM_PM }
  ];

  fieldOrderChoices = [
    { label: 'Per locale', value: DateFieldOrder.PER_LOCALE },
    { label: 'Year/Month/Date', value: DateFieldOrder.YMD },
    { label: 'Date/Month/Year', value: DateFieldOrder.DMY },
    { label: 'Month/Date/Year', value: DateFieldOrder.MDY },
  ];

  localeList = [
    'default',
    'af', 'ar', 'ar-dz', 'ar-eg', 'ar-kw', 'ar-ly', 'ar-ma', 'ar-sa', 'ar-tn', 'az', 'be', 'bg', 'bm', 'bn',
    'bn-bd', 'bo', 'br', 'bs', 'ca', 'cs', 'cy', 'da', 'de', 'de-at', 'de-ch', 'el', 'en', 'en-au', 'en-ca',
    'en-gb', 'en-ie', 'en-il', 'en-in', 'en-nz', 'en-sg', 'en-us', 'eo', 'es', 'es-do', 'es-mx', 'es-us', 'et',
    'eu', 'fa', 'fi', 'fil', 'fo', 'fr', 'fr-ca', 'fr-ch', 'fy', 'ga', 'gd', 'gl', 'gu', 'hi', 'hr', 'hu',
    'hy-am', 'is', 'it', 'it-ch', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'ku', 'ky', 'lb', 'lo', 'lt', 'lv',
    'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'ms-my', 'mt', 'my', 'nb', 'ne', 'nl', 'nl-be', 'nn', 'pl', 'pt',
    'pt-br', 'ro', 'ru', 'sd', 'se', 'si', 'sk', 'sl', 'sq', 'sr', 'sv', 'sw', 'ta', 'te', 'tg', 'th',
    'tk', 'tr', 'tzm', 'ug-cn', 'uk', 'ur', 'uz', 'vi', 'yo', 'zh-cn', 'zh-hk', 'zh-tw',
    ''
  ].map(s => ({ label: s, value: s }));

  /* cspell:disable */ // noinspection SpellCheckingInspection
  numSystems = [
    'default',
    'arab', 'arabext', 'bali', 'beng', 'cham', 'deva', 'guru', 'java', 'kali', 'khmr', 'knda', 'lana',
    'lanatham', 'laoo', 'latn', 'lepc', 'limb', 'mlym', 'mong', 'mtei', 'mymr', 'mymrshan', 'mymrtlng', 'nkoo',
    'olck', 'orya', 'saur', 'sund', 'talu', 'tamldec', 'telu', 'thai', 'tibt', 'vaii',
    ''
  ].map(s => ({ label: s, value: s }));
  /* cspell:enable */

  secondsChoices = [
    { label: 'No seconds', value: 0 },
    { label: 'Seconds', value: 1 },
    { label: 'Seconds/10', value: 2 },
    { label: 'Seconds/100', value: 3 },
    { label: 'Milliseconds', value: 4 }
  ];

  styleChoices = [
    { label: 'Date and time', value: DateTimeStyle.DATE_AND_TIME },
    { label: 'Date only', value: DateTimeStyle.DATE_ONLY },
    { label: 'Time only', value: DateTimeStyle.TIME_ONLY }
  ];

  yearLengthChoices = [
    { label: 'Year length per locale', value: 0 },
    { label: '4/variable-digit year', value: 4 },
    { label: '2-digit year', value: 2 }
  ];

  yearStyleChoices = [
    { label: 'Positive-only years', value: YearStyle.POSITIVE_ONLY },
    { label: 'AD/BC years', value: YearStyle.AD_BC, disabled: false },
    { label: 'Signed years', value: YearStyle.SIGNED }
  ];

  yearStyleChoicesIso = clone(this.yearStyleChoices);

  constructor(private appService: AppService) {
    let settings: any;

    try {
      settings = JSON.parse(localStorage.getItem('tze-code-settings') ?? 'null');
    }
    catch {}

    settings = settings ?? defaultSettings;
    this.updateTimer = null;
    Object.keys(defaultSettings).forEach(key => (this as any)[key] = settings[key]);

    if (!this.customLocale)
      this.customLocale = 'default';

    if (!this.numSystem)
      this.numSystem = 'default';

    this.updateTimer = undefined;
    window.addEventListener('visibilitychange', () => {
      if (this.updateTimer)
        clearTimeout(this.updateTimer);

      this.saveSettings();
    });

    this.initDone = true;
    this.yearStyleChoicesIso[1].disabled = true;
  }

  setNow(): void {
    this.time = new DateTime().taiMillis;
  }

  private saveSettings(): void {
    if (!this.initDone)
      return;

    const settings: any = {};

    Object.keys(defaultSettings).forEach(key => settings[key] = (this as any)[key]);
    localStorage.setItem('tze-code-settings', JSON.stringify(settings));
  }

  settingsUpdated(): void {
    if (this.initDone && this.updateTimer === undefined) {
      this.updateTimer = setTimeout(() => {
        this.saveSettings();
        this.updateTimer = undefined;
      }, 1000);
    }
  }

  localeBlurred(): void {
    if (!this.customLocale)
      this.customLocale = 'default';
  }

  numSystemBlurred(): void {
    if (!this.numSystem)
      this.numSystem = 'default';
  }

  get timezones(): any[] {
    if (this.lastZones !== this.appService.timezones || !this.timezoneChoices) {
      this.lastZones = this.appService.timezones;
      this.timezoneChoices = this.appService.timezones.map(zone => ({ label: zone, value: zone }));
    }

    return this.timezoneChoices;
  }

  setFloat(state: boolean): void {
    this.float = state;

    if (state && !this.floatPosition) {
      const sampleEditor = document.querySelector('#sample');

      if (sampleEditor) {
        const r = sampleEditor.getBoundingClientRect();

        this.floatPosition = { x: r.x, y: r.y };
      }
      else
        this.floatPosition = { x: 0, y: 0 };
    }
    else if (!state)
      this.floatPosition = null;

    this.settingsUpdated();
  }

  get customLocale(): string { return this._customLocale; }
  set customLocale(newValue: string) {
    newValue = newValue || '';

    if (this._customLocale !== newValue || !this.localeGood) {
      try {
        if (newValue && newValue !== 'default')
          new Intl.DateTimeFormat(newValue);
      }
      catch {
        this.localeGood = false;
        return;
      }

      this.localeGood = true;
      this._customLocale = newValue;
      this.settingsUpdated();
    }
  }

  getCustomLocale(): string {
    if (this.customLocale === 'default')
      return isArray(this.defaultLocale) ? this.defaultLocale[0] : this.defaultLocale;
    else
      return this.customLocale;
  }

  get customTimezone(): string { return this._customTimezone; }
  set customTimezone(newValue: string) {
    newValue = newValue ?? defaultSettings.customTimezone;

    if (this._customTimezone !== newValue || !this.timezoneGood) {
      if (newValue && Timezone.has(newValue) && new DateTime(null, newValue).valid) {
        this._customTimezone = newValue;
        this.timezoneGood = true;
        this.settingsUpdated();
      }
      else
        this.timezoneGood = !this.timezoneGood || !newValue;
    }
  }

  get max(): string { return this._max; }
  set max(newValue: string) {
    if (this._max !== newValue || !this.maxGood) {
      try {
        new TimeEditorLimit(newValue);
      }
      catch {
        this.maxGood = false;
        return;
      }

      this._max = newValue;
      this.maxGood = true;
      this.settingsUpdated();
    }
  }

  get min(): string { return this._min; }
  set min(newValue: string) {
    if (this._min !== newValue || !this.minGood) {
      try {
        new TimeEditorLimit(newValue);
      }
      catch {
        this.minGood = false;
        return;
      }

      this._min = newValue;
      this.minGood = true;
      this.settingsUpdated();
    }
  }

  get secondsMode(): number { return this._secondsMode; }
  set secondsMode(value: number) {
    value = toNumber(value);

    if (this._secondsMode !== value) {
      this._secondsMode = value;
      this.showSeconds = (value > 0);
      this.millis = max(value - 1, 0);
    }
  }

  get numSystem(): string { return this._numSystem; }
  set numSystem(newValue: string) {
    newValue = newValue || '';

    if (!newValue || newValue === 'default') {
      this.numSystemGood = true;
      this._numSystem = newValue;
    }
    else if (this._numSystem !== newValue || !this.numSystemGood) {
      try {
        if (!newValue || new Intl.NumberFormat('en-u-nu-' + newValue).resolvedOptions().numberingSystem === newValue) {
          this.numSystemGood = true;
          this._numSystem = newValue;
          this.settingsUpdated();
          return;
        }
      }
      catch {}

      this.numSystemGood = false;
    }
  }

  getOptions(): MixedTimeEditorOptions {
    if (this.iso)
      return ['ISO', {
        dateTimeStyle: this.customStyle || DateTimeStyle.DATE_AND_TIME,
        millisDigits: this.millis,
        showDstSymbol: this.showDst,
        showOccurrence: this.showOccurrence,
        showSeconds: this.showSeconds,
        showUtcOffset: this.showOffset,
        yearStyle: (this.yearStyle ?
          (this.iso && this.yearStyle === YearStyle.AD_BC ? YearStyle.SIGNED : this.yearStyle) : YearStyle.POSITIVE_ONLY)
      }];
    else
      return {
        dateFieldOrder: this.dateFieldOrder || DateFieldOrder.PER_LOCALE,
        dateTimeStyle: this.customStyle || DateTimeStyle.DATE_AND_TIME,
        hourStyle: this.customCycle || HourStyle.PER_LOCALE,
        locale: this.getCustomLocale(),
        millisDigits: this.millis,
        numbering: !this.numSystem || this.numSystem === 'default' ? undefined : this.numSystem,
        showDstSymbol: this.showDst,
        showOccurrence: this.showOccurrence,
        showSeconds: this.showSeconds,
        showUtcOffset: this.showOffset,
        twoDigitYear: this.yearLength ? this.yearLength === 2 : undefined,
        yearStyle: this.yearStyle || YearStyle.POSITIVE_ONLY
      };
  }

  getCustomCaption(lang?: string): string {
    if (this.iso)
      return 'ISO 8601 format';

    const locale = this.customLocale;

    lang = lang || (locale !== 'default' && locale.substr(0, 2)) || navigator.language;

    let result = '?';

    try {
      result = intl_DisplayNames &&
        // eslint-disable-next-line new-cap
        new (intl_DisplayNames)(lang, { type: 'language' })
          .of(!this.customLocale || this.customLocale === 'default' ? this.defaultLocale : this.customLocale);
    }
    catch {}

    if (lang !== 'en') {
      const enCaption = this.getCustomCaption('en');

      if (enCaption !== result)
        result = enCaption + ' • ' + result;
    }

    return result;
  }

  inputBackground(good: boolean): string {
    return good ? 'inherit' : this.darkMode ? '#803' : '#FBC';
  }

  get calendarDate(): YMDDate {
    const currDate = new DateTime({ tai: this.time }, this.customTimezone).wallTimeSparse;

    delete currDate.hrs;
    delete currDate.min;
    delete currDate.sec;
    delete currDate.millis;

    if (!isEqual(this._calendarDate, currDate))
      this._calendarDate = currDate;

    return this._calendarDate;
  }

  set calendarDate(newValue: YMDDate) {
    const value = clone(newValue) as DateAndTime;

    value.hrs = 12;
    value.min = value.sec = value.millis = 0;

    const dt = new DateTime(value);
    const newDate = dt.wallTimeSparse;

    delete newDate.hrs;
    delete newDate.min;
    delete newDate.sec;
    delete newDate.millis;

    if (!isEqual(this._calendarDate, newDate)) {
      this._calendarDate = newDate;
      this.time = dt.taiMillis;
    }
  }
}
