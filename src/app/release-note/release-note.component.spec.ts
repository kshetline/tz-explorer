import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReleaseNoteComponent } from './release-note.component';

describe('ReleaseNoteComponent', () => {
  let component: ReleaseNoteComponent;
  let fixture: ComponentFixture<ReleaseNoteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReleaseNoteComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReleaseNoteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
