import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ClocksComponent } from './clocks.component';

describe('ClocksComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        ClocksComponent
      ],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(ClocksComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
