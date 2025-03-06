import { AfterViewInit, Directive, ElementRef } from '@angular/core';
import { Select } from 'primeng/select';
import { getCssValues, getTextWidth, isObject } from '@tubular/util';
import { max } from '@tubular/math';

@Directive({
  selector: '[tzeSelectAutosizer]',
  standalone: false
})
export class PSelectAutosizerDirective implements AfterViewInit {
  private calcWidthTries = 0;

  constructor(
    private host: Select,
    private elementRef: ElementRef
  ) {}

  ngAfterViewInit(): void {
    this.calcWidth();
  }

  private calcWidth(): void {
    const elem = this.elementRef.nativeElement as HTMLElement;
    const trigger = elem.querySelector('.p-select-dropdown');
    const triggerWidth = trigger?.getBoundingClientRect()?.width;

    if (!triggerWidth || !this.host.options || this.host.options.length === 0) {
      if (++this.calcWidthTries < 30)
        setTimeout(() => this.calcWidth(), 100);

      return;
    }

    let maxWidth = 0;
    const label = elem.querySelector('.p-select-label') as HTMLElement;

    for (const opt of this.host.options) {
      let text: string;

      if (isObject(opt))
        text = opt[this.host.optionLabel || 'label'];
      else
        text = opt.toString();

      maxWidth = max(getTextWidth(text, label), maxWidth);
    }

    const comp = elem.querySelector('.p-select.p-component');

    maxWidth += (comp && getCssValues(comp, ['border-left-width', 'border-right-width'])
      .reduce((sum, curr) => sum + parseFloat(curr), 0)) ?? 2;
    maxWidth += (label && getCssValues(label, ['padding-left', 'padding-right'])
      .reduce((sum, curr) => sum + parseFloat(curr), 0)) ?? 12.5;
    maxWidth += triggerWidth + 2;

    this.elementRef.nativeElement.style.width = maxWidth + 'px';
  }
}
