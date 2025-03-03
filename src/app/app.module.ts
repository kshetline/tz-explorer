import { provideHttpClient, withInterceptorsFromDi, withJsonpSupport } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
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
import { appConfig } from './mytheme';

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
  bootstrap: [AppComponent],
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
    IconField,
    InputIcon,
    InputTextModule,
    RadioButtonModule,
    RippleModule,
    TabViewModule,
    TubularNgWidgetsModule
  ],
  providers: [
    provideAnimationsAsync(),
    appConfig.providers[1],
    AppService,
    HttpTimePoller,
    TzExplorerApi,
    provideHttpClient(withInterceptorsFromDi(), withJsonpSupport())
  ]
})

export class AppModule {}
