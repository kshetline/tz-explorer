import { HttpClientJsonpModule, HttpClientModule } from '@angular/common/http';
import { /* ApplicationRef, */ NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { RippleModule } from 'primeng/ripple';
import { TabViewModule } from 'primeng/tabview';

import { TubularNgWidgetsModule } from '@tubular/ng-widgets';

import { AddClockDialogComponent } from './add-clock-dialog/add-clock-dialog.component';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AppService } from './app.service';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { PDropdownFixDirective } from './util/p-dropdown-scroll-fix.directive';
import { TimezoneSelectorComponent } from './timezone-selector/timezone-selector.component';
import { TzExplorerApi } from './api/api';
import { HttpTimePoller } from './http-time-poller/http-time-poller';
import { ClocksComponent } from './clocks/clocks.component';
import { DownloadsComponent } from './downloads/downloads.component';
import { ZoneHistoryComponent } from './zone-history/zone-history.component';
import { ReleaseNoteComponent } from './release-note/release-note.component';
import { CodeComponent } from './code/code.component';
import { PDropdownAutosizerDirective } from './util/p-dropdown-autosizer.directive';

@NgModule({
  declarations: [
    AddClockDialogComponent,
    AppComponent,
    ClocksComponent,
    PDropdownAutosizerDirective,
    PDropdownFixDirective,
    TimezoneSelectorComponent,
    DownloadsComponent,
    ZoneHistoryComponent,
    ReleaseNoteComponent,
    CodeComponent
  ],
  imports: [
    AppRoutingModule,
    AutoCompleteModule,
    BrowserModule,
    BrowserAnimationsModule,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    DropdownModule,
    FormsModule,
    HttpClientJsonpModule,
    HttpClientModule,
    InputTextModule,
    RadioButtonModule,
    RippleModule,
    TabViewModule,
    TubularNgWidgetsModule,
  ],
  providers: [
    AppService,
    HttpTimePoller,
    TzExplorerApi
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  // constructor(applicationRef: ApplicationRef) {
  //   const originalTick = applicationRef.tick;
  //   applicationRef.tick = function (...args: any[]): void {
  //     const windowPerformance = window.performance;
  //     const  before = windowPerformance.now();
  //     const retValue = originalTick.apply(this, ...args);
  //     const after = windowPerformance.now();
  //     const runTime = after - before;
  //     window.console.log('CHANGE DETECTION TIME', runTime);
  //     return retValue;
  //   };
  // }
}
