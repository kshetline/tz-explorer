import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { abs, Point } from '@tubular/math';
import { eventToKey, isAndroid, isEdge, isIE, isIOS, isString, toBoolean } from '@tubular/util';
import { Subscription, timer } from 'rxjs';
import { getXYForTouchEvent } from '../util/touch-events';

export interface SequenceItemInfo {
  editable?: boolean;
  hidden?: boolean;
  indicator?: boolean;
  selected?: boolean;
  sizing?: string | string[];
  spinner?: boolean;
  value?: string | number;
  variableWidth?: boolean;
}

export const FORWARD_TAB_DELAY = 250;

const KEY_REPEAT_DELAY = 500;
const KEY_REPEAT_RATE  = 100;
const WARNING_DURATION = 5000;
const FALSE_REPEAT_THRESHOLD = 50;

const DIGIT_SWIPE_THRESHOLD = 6;

const NO_SELECTION = -1;
const SPIN_UP      = -2;
const SPIN_DOWN    = -3;

const FLASH_DURATION = 100;
const NORMAL_BACKGROUND    = 'white';
const DISABLED_BACKGROUND  = '#CCC';
const ERROR_BACKGROUND     = '#F67';
const VIEW_ONLY_BACKGROUND = 'black';
const WARNING_BACKGROUND   = '#FC6';

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
  SPIN_DOWN = SPIN_DOWN;
  SPIN_UP = SPIN_UP;

  private static lastKeyTimestamp = 0;
  private static lastKeyKey = '';
  private static useHiddenInput = isAndroid();
  private static checkForRepeatedKeyTimestamps = isIOS();
  private static disableContentEditable = isEdge() || isIE();

  protected static addFocusOutline = isEdge() || isIE() || isIOS();

  static touchHasOccurred = false;

  private activeSpinner = NO_SELECTION;
  private _blank = false;
  private clickTimer: Subscription;
  private _disabled = false;
  private firstTouchPoint: Point;
  private focusTimer: any;
  private getCharFromInputEvent = false;
  private hasCanvasFocus = false;
  private hasHiddenInputFocus = false;
  private keyTimer: Subscription;
  private lastDelta = 1;
  private touchDeltaY = 0;
  private _viewOnly = false;
  private warningTimer: Subscription;

  protected font: string;
  protected hasFocus = false;
  protected height = 17;
  protected hiddenInput: HTMLInputElement;
  protected hOffsets: number[] = [];
  protected lastTabTime = 0;
  protected selection = 0;
  protected setupComplete = false;
  protected showFocus = false;
  protected signDigit = -1;
  protected touchEnabled = false;

  displayState = 'normal';
  items: SequenceItemInfo[] = [];
  useAlternateTouchHandling = false;

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
    this.createDigits();
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
    }
  }

  getFontClassForItem(item: SequenceItemInfo): string {
    if (!item.variableWidth && item.indicator)
      return 'fixed-indicator-font';
    else if (item.indicator)
      return 'variable-indicator-font';
    else if (item.variableWidth)
      return 'variable-font';
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
      return this.getStaticBackgroundColor();
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

  onMouseDown(index: number, evt: MouseEvent): void {
    if (this._disabled || this.viewOnly || evt.button !== 0)
      return;
    else if ((index === SPIN_UP || index === SPIN_DOWN) && !this.clickTimer) {
      this.activeSpinner = index;
      this.lastDelta = (index === SPIN_UP ? 1 : -1);

      this.clickTimer = timer(KEY_REPEAT_DELAY, KEY_REPEAT_RATE).subscribe(() => {
        this.onSpin(this.lastDelta);
      });
    }
  }

  onMouseUp(): void {
    if (this._disabled || this.viewOnly)
      return;

    if (this.clickTimer) {
      this.stopClickTimer();
      this.onSpin(this.lastDelta);
    }
  }

  onMouseLeave(): void {
    this.stopClickTimer();
  }

  onClick(index: number): void {
    if (this._disabled || this.viewOnly)
      return;

    this.updateSelection(index);
  }

  protected updateSelection(newSelection: number): void {
    if (this.selection !== newSelection &&
        newSelection !== SPIN_UP && newSelection !== SPIN_DOWN && this.items[newSelection].editable) {
      if (this.selection > 0)
        this.items[this.selection].selected = false;

      this.selection = newSelection;

      if (this.focusTimer) {
        clearTimeout(this.focusTimer);
        this.focusTimer = undefined;
        this.showFocus = true;
      }

      if (this.selection > 0)
        this.items[this.selection].selected = true;
    }
  }

  onFocus(value: boolean): void {
    if (value && this.viewOnly)
      return;

    if (this.hasCanvasFocus !== value) {
      this.hasCanvasFocus = value;

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
    return this.hasCanvasFocus || this.hasHiddenInputFocus;
  }

  protected checkFocus(): void {
    const newFocus = this.hasAComponentInFocus();

    if (this.hasFocus !== newFocus) {
      this.hasFocus = newFocus;

      if (newFocus) {
        this.focusTimer = setTimeout(() => {
          this.focusTimer = undefined;
          this.showFocus = true;
        }, 500);
        this.gainedFocus();
      }
      else {
        this.showFocus = false;
        this.lostFocus();
      }
    }

    // if (this.hiddenInput && !this.disabled)
    //   this.canvas.style.outline = getCssValue(this.hiddenInput, 'outline');
    // else if (DigitSequenceEditorDirective.addFocusOutline)
    //   this.canvas.style.outline = (newFocus && !this.disabled ? 'rgb(59, 153, 252) solid 1px' : 'black none 0px');
  }

  protected gainedFocus(): void {}
  protected lostFocus(): void {}

  onKeyDown(event: KeyboardEvent): boolean {
    const key = eventToKey(event);

    // For some strange reason, iOS external mobile keyboards (at least one Logitech model, and one Apple model)
    // are sometimes generating two keydown events for one single keypress, both events with the same timestamp,
    // very close timestamps, or even a later-arriving event with an earlier timestamp than the first. We need to
    // reject the repeated event.
    //
    // On the other hand, one Android external keyboard I've tested with sends the same timestamp multiple times
    // for legitimately separate keystrokes, so repeated timestamps have to be expected and allowed there.
    //
    if (DigitSequenceEditorComponent.checkForRepeatedKeyTimestamps &&
        (abs(event.timeStamp - DigitSequenceEditorComponent.lastKeyTimestamp) <= FALSE_REPEAT_THRESHOLD &&
         key === DigitSequenceEditorComponent.lastKeyKey)) {
      event.preventDefault();

      return false;
    }

    // With Android many on-screen keyboard key events carry no useful information about the key that was
    // pressed. They instead match the following test and we have to grab a character out of the hidden
    // input field to find out what was actually typed in.
    // noinspection JSDeprecatedSymbols (for `keyCode`)
    if (this.hiddenInput && key === 'Unidentified' && event.keyCode === 229) {
      this.getCharFromInputEvent = true;
      DigitSequenceEditorComponent.lastKeyTimestamp = event.timeStamp;

      return true;
    }

    if (key === 'Tab')
      this.lastTabTime = performance.now();

    if (key === 'Tab' || event.altKey || event.ctrlKey || event.metaKey || /^F\d+$/.test(key))
      return true;

    // If the built-in auto-repeat is in effect, ignore keystrokes that come along until that auto-repeat ends.
    if (!this.keyTimer && key !== 'Shift') {
      this.onKey(key);
      this.keyTimer = timer(KEY_REPEAT_DELAY, KEY_REPEAT_RATE).subscribe(() => this.onKey(key));
    }

    event.preventDefault();
    DigitSequenceEditorComponent.lastKeyTimestamp = event.timeStamp;
    DigitSequenceEditorComponent.lastKeyKey = key;

    return false;
  }

  onKeyUp(): boolean {
    this.stopKeyTimer();

    return true;
  }

  // noinspection JSMethodCanBeStatic
  onKeyPress(event: KeyboardEvent): boolean {
    const key = eventToKey(event);

    if (key === 'Tab')
      this.lastTabTime = performance.now();

    if (key === 'Tab' || event.altKey || event.ctrlKey || event.metaKey || /^F\d+$/.test(key))
      return true;

    event.preventDefault();
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
    if (this._disabled || this.viewOnly || !this.hasFocus || !this.items[this.selection].editable)
      return;

    if (this.selection !== this.signDigit) {
      if (key === '-')
        key = 'ArrowDown';
      else if (key === '+' || key === '=')
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

    for (let i = this.selection - 1; i >= 0; --i) {
      if (this.items[i].editable) {
        nextSelection = i;
        break;
      }
    }

    if (nextSelection !== NO_SELECTION) {
      this.items[this.selection].selected = false;
      this.selection = nextSelection;
      this.items[this.selection].selected = true;
    }
  }

  protected cursorRight(): void {
    let nextSelection = -1;

    for (let i = this.selection + 1; i < this.items.length; ++i) {
      if (this.items[i].editable) {
        nextSelection = i;
        break;
      }
    }

    if (nextSelection >= 0) {
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
  }
}
