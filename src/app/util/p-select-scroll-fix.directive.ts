import { Directive, ElementRef, OnDestroy, OnInit } from '@angular/core';

@Directive({
  selector: '[tzeSelectFix]',
  standalone: false
})
export class PSelectFixDirective implements OnDestroy, OnInit {
  private select: HTMLElement;

  constructor(private selectRef: ElementRef) {}

  ngOnInit(): void {
    this.select = this.selectRef.nativeElement;
    this.select?.addEventListener('click', this.onClick);
  }

  ngOnDestroy(): void {
    this.select?.removeEventListener('click', this.onClick);
  }

  onClick = (): void => {
    const classId = Array.from(this.select?.classList || []).find(cls => /^ng-tns-c/.test(cls));
    const wrapper = classId && document.querySelector('.p-select-items-wrapper.' + classId);
    const selected = wrapper?.querySelector('.p-select-item.p-highlight') as HTMLElement;

    selected?.scrollIntoView();
  };
}
