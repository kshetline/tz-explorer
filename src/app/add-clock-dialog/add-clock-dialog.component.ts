import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'tze-add-clock-dialog',
  templateUrl: './add-clock-dialog.component.html',
  styleUrls: ['./add-clock-dialog.component.scss']
})
export class AddClockDialogComponent {
  private _visible = false;

  @Input() asLocal = false;
  @Output() asLocalChange = new EventEmitter<boolean>();

  @Input() timezone: string;
  @Output() timezoneChange = new EventEmitter<string>();

  @Input() get visible(): boolean { return this._visible; }
  set visible(newValue: boolean) {
    if (this._visible !== newValue) {
      this._visible = newValue;
      this.visibleChange.emit(newValue);
    }
  }

  @Output() visibleChange = new EventEmitter<boolean>();

  @Output() done = new EventEmitter<void>();

  @HostListener('document:keydown.escape', ['$event'])
  close(evt?: KeyboardEvent): void {
    if (this.visible && evt)
      evt.preventDefault();

    this.visible = false;
  }

  @HostListener('document:keydown.enter', ['$event'])
  submit(evt?: KeyboardEvent): void {
    if (this.visible && evt)
      evt.preventDefault();

    this.visible = false;
    this.timezoneChange.emit(this.timezone);
    this.asLocalChange.emit(this.asLocal);
    this.done.emit();
  }
}
