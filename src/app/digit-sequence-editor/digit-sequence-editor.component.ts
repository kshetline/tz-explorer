import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { abs, max, min, mod, Point, round, sign } from '@tubular/math';
import { eventToKey, getCssValue, isAndroid, isEdge, isIE, isIOS, isString, processMillis, toBoolean, toNumber } from '@tubular/util';
import { Subscription, timer } from 'rxjs';
import { getPageXYForTouchEvent } from '../util/touch-events';

export interface SequenceItemInfo {
  editable?: boolean;
  emWidth?: number;
  indicator?: boolean;
  monospaced?: boolean;
  name?: string;
  selected?: boolean;
  spinner?: boolean;
  static?: boolean;
  swipeAbove?: string;
  swipeBelow?: string;
  value?: string | number;
}

export const FORWARD_TAB_DELAY = 250;

const FALSE_REPEAT_THRESHOLD = 50;
const KEY_REPEAT_DELAY = 500;
const KEY_REPEAT_RATE  = 100;
const WARNING_DURATION = 5000;

const DIGIT_SWIPE_THRESHOLD = 6;
const MAX_DIGIT_SWIPE = 0.9;
const MIN_DIGIT_SWIPE = 0.33;
const SWIPE_SMOOTHING_WINDOW = 500;

const NO_SELECTION = -1;
const SPIN_UP      = -2;
const SPIN_DOWN    = -3;

const FLASH_DURATION = 100;
const NORMAL_BACKGROUND    = 'white';
const DISABLED_BACKGROUND  = '#CCC';
const ERROR_BACKGROUND     = '#F67';
const VIEW_ONLY_BACKGROUND = 'black';
const WARNING_BACKGROUND   = '#FC6';

const addFocusOutline = isEdge() || isIE() || isIOS();
const disableContentEditable = isEdge() || isIE();

export const BACKGROUND_ANIMATIONS = trigger('displayState', [
  state('error',    style({ backgroundColor: ERROR_BACKGROUND })),
  state('normal',   style({ backgroundColor: NORMAL_BACKGROUND })),
  state('warning',  style({ backgroundColor: WARNING_BACKGROUND })),
  state('viewOnly', style({ backgroundColor: VIEW_ONLY_BACKGROUND })),
  state('disabled', style({ backgroundColor: DISABLED_BACKGROUND })),
  transition('normal => error',  animate(FLASH_DURATION)),
  transition('error => normal',  animate(FLASH_DURATION)),
  transition('warning => error', animate(FLASH_DURATION)),
  transition('error => warning', animate(FLASH_DURATION))]);

const NORMAL_TEXT          = 'black';
const DISABLED_ARROW_COLOR = '#060';
const DISABLED_TEXT        = '#999';
const INDICATOR_TEXT       = 'blue';
const SELECTED_TEXT        = 'white';
const VIEW_ONLY_TEXT       = '#0F0';

const touchListener = (): void => {
  DigitSequenceEditorComponent.touchHasOccurred = true;
  document.removeEventListener('touchstart', touchListener);
};

document.addEventListener('touchstart', touchListener);

@Component({
  selector: 'tz-digit-sequence-editor',
  animations: [BACKGROUND_ANIMATIONS],
  templateUrl: './digit-sequence-editor.component.html',
  styleUrls: ['./digit-sequence-editor.component.scss']
})
export class DigitSequenceEditorComponent implements OnInit, OnDestroy {
  addFocusOutline = addFocusOutline;
  disableContentEditable = disableContentEditable;
  SPIN_DOWN = SPIN_DOWN;
  SPIN_UP = SPIN_UP;

  private static lastKeyTimestamp = 0;
  private static lastKeyKey = '';
  private static useHiddenInput = isAndroid();
  private static checkForRepeatedKeyTimestamps = isIOS();

  static touchHasOccurred = false;

  private activeSpinner = NO_SELECTION;
  private _blank = false;
  private clickTimer: Subscription;
  private _disabled = false;
  private firstTouchPoint: Point;
  private focusTimer: any;
  private getCharFromInputEvent = false;
  private hasHiddenInputFocus = false;
  private hasWrapperFocus = false;
  private keyTimer: Subscription;
  private lastDelta = 1;
  private touchDeltaY = 0;
  private touchDeltaYs: number[] = [];
  private touchDeltaTimes: number[] = [];
  private _viewOnly = false;
  private warningTimer: Subscription;

  protected font: string;
  protected hiddenInput: HTMLInputElement;
  protected hOffsets: number[] = [];
  protected lastTabTime = 0;
  protected letterDecrement = 'z';
  protected letterIncrement = 'a';
  protected setupComplete = false;
  protected showFocus = false;
  protected signDigit = -1;
  protected swipeIndex = -1;
  protected _tabindex = '1';
  protected touchEnabled = true; // TODO
  protected wrapper: HTMLElement;

  protected static addFocusOutline = isEdge() || isIE() || isIOS();

  digitHeight = 17;
  displayState = 'normal';
  hasFocus = false;
  items: SequenceItemInfo[] = [];
  selection = 0;
  smoothedDeltaY = 0;
  useAlternateTouchHandling = false;

  @ViewChild('wrapper', { static: true }) private wrapperRef: ElementRef;

  get viewOnly(): boolean { return this._viewOnly; }
  @Input() set viewOnly(value: boolean) {
    this._viewOnly = value;
    this.adjustState();
  }

  get blank(): boolean { return this._blank; }
  @Input() set blank(value: boolean) {
    if (this._blank !== value) {
      this._blank = value;
    }
  }

  get disabled(): boolean | string { return this._disabled; }
  @Input() set disabled(value: boolean | string) {
    if (isString(value))
      value = toBoolean(value, false, true);

    this._disabled = value;
    this.adjustState();
  }

  get tabindex(): string { return this._tabindex; }
  @Input() set tabindex(newValue: string) {
    if (this._tabindex !== newValue) {
      this._tabindex = newValue;
      this.adjustState();
    }
  }

  protected checkForWarning(): void {
    if (this.shouldWarn())
      this.startWarning(); // Start or extend time in warning mode.
    else
      this.endWarning();
  }

  protected shouldWarn(): boolean {
    return false;
  }

  protected startWarning(): void {
    if (this.warningTimer)
      this.warningTimer.unsubscribe();

    this.displayState = 'warning';
    this.warningTimer = timer(WARNING_DURATION).subscribe(() => {
      this.endWarning();
    });
  }

  protected endWarning(): void {
    this.displayState = 'normal';

    if (this.warningTimer) {
      this.warningTimer.unsubscribe();
      this.warningTimer = undefined;
    }
  }

  ngOnInit(): void {
    this.wrapper = this.wrapperRef.nativeElement;
    this.createDigits();
    this.createHiddenInput();
  }

  ngOnDestroy(): void {
    this.stopKeyTimer();
    this.stopClickTimer();
  }

  protected createDigits(): void {
    this.selection = 10;

    for (let i = 0; i <= 10; ++i) {
      this.items.push({ value: i === 5 ? ':' : i - (i > 5 ? 1 : 0), editable: i !== 5, selected: i === this.selection });
    }

    this.items.push({ spinner: true });
  }

  protected createHiddenInput(): void {
    if (DigitSequenceEditorComponent.useHiddenInput) {
      this.hiddenInput = document.createElement('input');
      this.hiddenInput.type = 'text';
      this.hiddenInput.autocomplete = 'off';
      this.hiddenInput.setAttribute('autocapitalize', 'off');
      this.hiddenInput.setAttribute('autocomplete', 'off');
      this.hiddenInput.setAttribute('autocorrect', 'off');
      this.hiddenInput.setAttribute('tabindex', this.disabled ? '-1' : this.tabindex);
      this.hiddenInput.style.position = 'absolute';
      this.hiddenInput.style.opacity = '0';
      (this.hiddenInput.style as any)['caret-color'] = 'transparent';
      (this.hiddenInput.style as any)['pointer-events'] = 'none';
      this.hiddenInput.style.left = '0';
      this.hiddenInput.style.top = '-6px';

      this.hiddenInput.addEventListener('keydown', event => this.onKeyDown(event));
      this.hiddenInput.addEventListener('keypress', event => this.onKeyPress(event));
      this.hiddenInput.addEventListener('keyup', () => this.onKeyUp());
      this.hiddenInput.addEventListener('input', () => this.onInput());
      this.hiddenInput.addEventListener('focus', () => this.onHiddenInputFocus(true));
      this.hiddenInput.addEventListener('blur', () => this.onHiddenInputFocus(false));

      this.wrapper.parentElement.appendChild(this.hiddenInput);
      this.wrapper.setAttribute('tabindex', '-1');
    }
  }

  getFontClassForItem(item: SequenceItemInfo): string {
    if (item.monospaced && item.indicator)
      return 'mono-indicator-font';
    else if (item.indicator)
      return 'indicator-font';
    else if (item.monospaced)
      return 'mono-font';
    else
      return null;
  }

  getStaticBackgroundColor(): string {
    if (this._disabled)
      return DISABLED_BACKGROUND;
    else if (this._viewOnly)
      return VIEW_ONLY_BACKGROUND;
    else
      return NORMAL_BACKGROUND;
  }

  getBackgroundColorForItem(item?: SequenceItemInfo, index?: number): string {
    if (!this._disabled && this.showFocus &&
        ((item && index === this.selection) || (!item && this.activeSpinner === index)))
      return NORMAL_TEXT;
    else
      return 'transparent';
  }

  getColorForItem(item?: SequenceItemInfo, index?: number): string {
    if (this._disabled)
      return DISABLED_TEXT;
    else if (item && this._viewOnly)
      return VIEW_ONLY_TEXT;
    else if (this._viewOnly)
      return DISABLED_ARROW_COLOR;
    else if (item && item.indicator)
      return INDICATOR_TEXT;
    else if (index === this.selection && this.showFocus)
      return SELECTED_TEXT;
    else
      return NORMAL_TEXT;
  }

  protected canSwipe(index: number): boolean {
    const item = this.items[index];

    return item?.editable && !item.indicator;
  }

  swipeable(item: SequenceItemInfo, index: number, delta: number): boolean {
    const nextValue = this.smoothedDeltaY < 0 ? item.swipeBelow : item.swipeAbove;

    return index === this.swipeIndex ||
      (sign(delta || this.smoothedDeltaY) === sign(this.smoothedDeltaY) && nextValue != null && item.value !== nextValue);
  }

  createSwipeValues(index: number): void {
    const item = this.items[index];
    const value = toNumber(item.value);

    if (this.canSwipe(index)) {
      if (index !== 0 || value < 9)
        item.swipeAbove = mod(toNumber(item.value) + 1, 10).toString();

      if (index !== 0 || value > 0)
        item.swipeBelow = mod(toNumber(item.value) - 1, 10).toString();
    }
  }

  returnFalse(): boolean {
    return false;
  }

  protected errorFlash(): void {
    this.displayState = 'error';
    timer(FLASH_DURATION).subscribe(() => { this.displayState = (this.warningTimer ? 'warning' : 'normal'); });
  }

  protected stopKeyTimer(): void {
    if (this.keyTimer) {
      this.keyTimer.unsubscribe();
      this.keyTimer = undefined;
    }
  }

  protected stopClickTimer(): void {
    if (this.clickTimer) {
      this.activeSpinner = NO_SELECTION;
      this.clickTimer.unsubscribe();
      this.clickTimer = undefined;
    }
  }

  onMouseDown(index: number, evt?: MouseEvent | TouchEvent): void {
    if (this._disabled || this.viewOnly || ((evt as any)?.button ?? 0) !== 0)
      return;
    else if (evt)
      evt.stopPropagation();

    if (this.items[index]?.spinner && evt?.target) {
      const r = (evt.target as HTMLElement).getBoundingClientRect();
      const y = ((evt as any).pageY ?? getPageXYForTouchEvent(evt as any).y);

      if (y < r.top + r.height / 2)
        index = SPIN_UP;
      else
        index = SPIN_DOWN;
    }

    if (!this.checkSpinAction(index))
      this.updateSelection(index);
  }

  onMouseUp(evt?: MouseEvent): void {
    if (this._disabled || this.viewOnly)
      return;
    else if (evt)
      evt.stopPropagation();

    if (this.clickTimer) {
      this.stopClickTimer();
      this.onSpin(this.lastDelta);
    }
  }

  onMouseLeave(): void {
    this.stopClickTimer();
  }

  onTouchStart(index: number, evt: TouchEvent): void {
    if (this._disabled || this.viewOnly || !this.touchEnabled)
      return;

    if (evt.cancelable)
      evt.preventDefault();

    if (!this.hasFocus && this.wrapper.focus)
      this.wrapper.focus();

    const target = this.wrapper.querySelector('.dse-item-' + index) as HTMLElement;

    if (target)
      this.digitHeight = target.getBoundingClientRect().height;
    else
      this.digitHeight = round(this.wrapper.getBoundingClientRect().height * 0.734);

    this.clearDeltaYSwiping();

    if (this.canSwipe(index)) {
      this.createSwipeValues(index);
      this.swipeIndex = index;
    }

    if (this.useAlternateTouchHandling)
      this.onTouchStartAlternate(index, evt);
    else
      this.onTouchStartDefault(index, evt);
  }

  onTouchMove(evt: TouchEvent): void {
    if (this._disabled || this.viewOnly || !this.touchEnabled)
      return;

    evt.preventDefault();
    evt.stopPropagation();

    if (this.selection >= 0 && this.firstTouchPoint) {
      const pt = getPageXYForTouchEvent(evt);

      this.touchDeltaY = pt.y - this.firstTouchPoint.y;
      this.updateDeltaYSmoothing();
    }
  }

  onTouchEnd(event: TouchEvent): void {
    const lastDeltaY = this.touchDeltaY;

    if (this._disabled || this.viewOnly || !this.touchEnabled)
      return;

    event.preventDefault();
    this.onMouseUp(null);

    if (this.swipeIndex >= 0 && this.firstTouchPoint) {
      if (abs(lastDeltaY) >= max(this.digitHeight * MIN_DIGIT_SWIPE, DIGIT_SWIPE_THRESHOLD)) {
        if (lastDeltaY > 0) {
          if (this.items[this.selection].swipeAbove != null)
            this.increment();
          else
            this.errorFlash();
        }
        else if (this.items[this.selection].swipeBelow != null)
          this.decrement();
        else
          this.errorFlash();
      }
    }

    if (this.touchDeltaY !== 0) {
      this.clearDeltaYSwiping();
    }
  }

  protected onTouchStartDefault(index: number, evt: TouchEvent): void {
    this.firstTouchPoint = getPageXYForTouchEvent(evt);
    this.onMouseDown(index, evt);
  }

  protected onTouchStartAlternate(_index: number, _event: TouchEvent): void {}

  protected updateSelection(newSelection: number): void {
    if (this.selection !== newSelection && this.items[newSelection]?.editable) {
      if (this.selection >= 0)
        this.items[this.selection].selected = false;

      this.selection = newSelection;

      if (this.focusTimer) {
        clearTimeout(this.focusTimer);
        this.focusTimer = undefined;
        this.showFocus = this.hasFocus;
      }

      if (this.selection > 0)
        this.items[this.selection].selected = true;
    }
  }

  private checkSpinAction(index: number): boolean {
    if ((index === SPIN_UP || index === SPIN_DOWN) && !this.clickTimer) {
      this.activeSpinner = index;
      this.lastDelta = (index === SPIN_UP ? 1 : -1);

      this.clickTimer = timer(KEY_REPEAT_DELAY, KEY_REPEAT_RATE).subscribe(() => {
        this.onSpin(this.lastDelta);
      });

      return true;
    }

    return false;
  }

  onFocus(value: boolean): void {
    if (value && this.viewOnly)
      return;

    if (this.hasWrapperFocus !== value) {
      this.hasWrapperFocus = value;

      if (value && this.hiddenInput && !this.hiddenInput.disabled)
        this.hiddenInput.focus();

      this.checkFocus();
    }
  }

  onHiddenInputFocus(value: boolean): void {
    if (value && this.viewOnly)
      return;

    if (this.hasHiddenInputFocus !== value) {
      this.hasHiddenInputFocus = value;
      this.checkFocus();
    }
  }

  protected hasAComponentInFocus(): boolean {
    return this.hasWrapperFocus || this.hasHiddenInputFocus;
  }

  protected checkFocus(): void {
    const newFocus = this.hasAComponentInFocus();

    if (this.hasFocus !== newFocus) {
      this.hasFocus = newFocus;

      if (this.focusTimer) {
        clearTimeout(this.focusTimer);
        this.focusTimer = undefined;
      }

      if (newFocus) {
        this.focusTimer = setTimeout(() => {
          this.focusTimer = undefined;
          this.showFocus = this.hasFocus;
        }, 250);
        this.gainedFocus();
      }
      else {
        this.showFocus = false;
        this.lostFocus();
      }
    }

    if (this.hiddenInput && !this.disabled)
      this.wrapper.style.outline = getCssValue(this.hiddenInput, 'outline');
    else if (DigitSequenceEditorComponent.addFocusOutline)
      this.wrapper.style.outline = (newFocus && !this.disabled ? 'rgb(59, 153, 252) solid 1px' : 'black none 0px');
  }

  protected gainedFocus(): void {}
  protected lostFocus(): void {}

  onKeyDown(evt: KeyboardEvent): boolean {
    const key = eventToKey(evt);

    // For some strange reason, iOS external mobile keyboards (at least one Logitech model, and one Apple model)
    // are sometimes generating two keydown events for one single keypress, both events with the same timestamp,
    // very close timestamps, or even a later-arriving event with an earlier timestamp than the first. We need to
    // reject the repeated event.
    //
    // On the other hand, one Android external keyboard I've tested with sends the same timestamp multiple times
    // for legitimately separate keystrokes, so repeated timestamps have to be expected and allowed there.
    //
    if (DigitSequenceEditorComponent.checkForRepeatedKeyTimestamps &&
        (abs(evt.timeStamp - DigitSequenceEditorComponent.lastKeyTimestamp) <= FALSE_REPEAT_THRESHOLD &&
         key === DigitSequenceEditorComponent.lastKeyKey)) {
      evt.preventDefault();

      return false;
    }

    // With Android many on-screen keyboard key events carry no useful information about the key that was
    // pressed. They instead match the following test and we have to grab a character out of the hidden
    // input field to find out what was actually typed in.
    // noinspection JSDeprecatedSymbols (for `keyCode`)
    if (this.hiddenInput && key === 'Unidentified' && evt.keyCode === 229) {
      this.getCharFromInputEvent = true;
      DigitSequenceEditorComponent.lastKeyTimestamp = evt.timeStamp;

      return true;
    }

    if (key === 'Tab')
      this.lastTabTime = performance.now();

    if (key === 'Tab' || evt.altKey || evt.ctrlKey || evt.metaKey || /^F\d+$/.test(key))
      return true;

    // If the built-in auto-repeat is in effect, ignore keystrokes that come along until that auto-repeat ends.
    if (!this.keyTimer && key !== 'Shift') {
      this.onKey(key);
      this.keyTimer = timer(KEY_REPEAT_DELAY, KEY_REPEAT_RATE).subscribe(() => this.onKey(key));
    }

    evt.preventDefault();
    DigitSequenceEditorComponent.lastKeyTimestamp = evt.timeStamp;
    DigitSequenceEditorComponent.lastKeyKey = key;

    return false;
  }

  onKeyUp(): boolean {
    this.stopKeyTimer();

    return true;
  }

  // noinspection JSMethodCanBeStatic
  onKeyPress(evt: KeyboardEvent): boolean {
    const key = eventToKey(evt);

    if (key === 'Tab')
      this.lastTabTime = performance.now();

    if (key === 'Tab' || evt.altKey || evt.ctrlKey || evt.metaKey || /^F\d+$/.test(key))
      return true;

    evt.preventDefault();
    return false;
  }

  onInput(): void {
    if (this.getCharFromInputEvent) {
      const currInput = this.hiddenInput.value;

      if (currInput && currInput.length > 0)
        this.onKey(currInput.substr(currInput.length - 1));
    }

    this.hiddenInput.value = '';
  }

  protected onKey(key: string): void {
    if (this._disabled || this.viewOnly || !this.hasFocus || !this.items[this.selection]?.editable)
      return;

    if (this.selection !== this.signDigit) {
      if (key === '-' || key.toLowerCase() === this.letterDecrement)
        key = 'ArrowDown';
      else if (key === '+' || key === '=' || key.toLowerCase() === this.letterIncrement)
        key = 'ArrowUp';
    }

    switch (key) {
      case 'ArrowUp':
        this.increment();
        break;

      case 'ArrowDown':
        this.decrement();
        break;

      case 'Backspace':
      case 'ArrowLeft':
        this.cursorLeft();
        break;

      case ' ':
      case 'ArrowRight':
      case 'Enter':
        this.cursorRight();
        break;

      default:
        if (key && key.length === 1)
          this.digitTyped(key.charCodeAt(0), key);
    }
  }

  protected onSpin(delta: number): void {
    if (this._disabled || this.viewOnly)
      return;

    if (delta > 0)
      this.increment();
    else if (delta < 0)
      this.decrement();
  }

  protected cursorLeft(): void {
    let nextSelection = NO_SELECTION;
    const start = (this.selection >= 0 ? this.selection : this.items.length);

    for (let i = start - 1; i >= 0; --i) {
      if (this.items[i].editable) {
        nextSelection = i;
        break;
      }
    }

    if (nextSelection !== NO_SELECTION) {
      if (this.selection >= 0)
        this.items[this.selection].selected = false;

      this.selection = nextSelection;
      this.items[this.selection].selected = true;
    }
  }

  protected cursorRight(): void {
    let nextSelection = -1;
    const start = (this.selection >= 0 ? this.selection : -1);

    for (let i = start + 1; i < this.items.length; ++i) {
      if (this.items[i].editable) {
        nextSelection = i;
        break;
      }
    }

    if (nextSelection >= 0) {
      if (this.selection >= 0)
        this.items[this.selection].selected = false;

      this.selection = nextSelection;
      this.items[this.selection].selected = true;
    }
  }

  protected increment(): void {
    this.items[this.selection].value = (<number> this.items[this.selection].value + 1) % 10;
  }

  protected decrement(): void {
    this.items[this.selection].value = (<number> this.items[this.selection].value + 9) % 10;
  }

  protected digitTyped(charCode: number, _key: string): void {
    if (48 <= charCode && charCode < 58) {
      this.items[this.selection].value = charCode - 48;
      this.cursorRight();
    }
  }

  private adjustState(): void {
    this.displayState = this._viewOnly ? 'viewOnly' : (this._disabled ? 'disabled' : 'normal');

    if (this.hiddenInput)
      this.hiddenInput.setAttribute('tabindex', this.disabled ? '-1' : this.tabindex);
  }

  private updateDeltaYSmoothing(): void {
    const now = processMillis();

    this.touchDeltaTimes = this.touchDeltaTimes.filter((time, i) => {
      if (time < now + SWIPE_SMOOTHING_WINDOW) {
        this.touchDeltaYs.splice(i, 1);
        return false;
      }

      return true;
    });

    this.touchDeltaTimes.push(now);
    this.touchDeltaYs.push(this.touchDeltaY);
    this.smoothedDeltaY = max(min(this.touchDeltaYs.reduce((sum, y) => sum + y) / this.touchDeltaYs.length,
      this.digitHeight * MAX_DIGIT_SWIPE), -this.digitHeight * MAX_DIGIT_SWIPE);
  }

  private clearDeltaYSwiping(): void {
    this.smoothedDeltaY = 0;
    this.touchDeltaTimes.length = 0;
    this.touchDeltaY = 0;
    this.touchDeltaYs.length = 0;
    this.swipeIndex = -1;
    this.items.forEach(item => item.swipeAbove = item.swipeBelow = null);
  }
}
