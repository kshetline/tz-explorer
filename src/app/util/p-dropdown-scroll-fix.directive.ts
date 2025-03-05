import { Directive, ElementRef, OnDestroy, OnInit } from '@angular/core';

@Directive({
  selector: '[tzeDropdownFix]',
  standalone: false
})
export class PDropdownFixDirective implements OnDestroy, OnInit {
  private dropdown: HTMLElement;

  constructor(private dropdownRef: ElementRef) {}

  ngOnInit(): void {
    this.dropdown = this.dropdownRef.nativeElement;
    this.dropdown?.addEventListener('click', this.onClick);
  }

  ngOnDestroy(): void {
    this.dropdown?.removeEventListener('click', this.onClick);
  }

  onClick = (): void => {
    const classId = Array.from(this.dropdown?.classList || []).find(cls => /^ng-tns-c/.test(cls));
    const wrapper = classId && document.querySelector('.p-dropdown-items-wrapper.' + classId);
    const selected = wrapper?.querySelector('.p-dropdown-item.p-highlight') as HTMLElement;

    selected?.scrollIntoView();
  };
}
