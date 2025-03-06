import { provideHttpClient, withInterceptorsFromDi, withJsonpSupport } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { RippleModule } from 'primeng/ripple';
import { SelectModule } from 'primeng/select';
import { TabViewModule } from 'primeng/tabview';

import { TubularNgWidgetsModule } from '@tubular/ng-widgets';

import { AddClockDialogComponent } from './add-clock-dialog/add-clock-dialog.component';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AppService } from './app.service';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { TimezoneSelectorComponent } from './timezone-selector/timezone-selector.component';
import { TzExplorerApi } from './api/api';
import { HttpTimePoller } from './http-time-poller/http-time-poller';
import { ClocksComponent } from './clocks/clocks.component';
import { DownloadsComponent } from './downloads/downloads.component';
import { ZoneHistoryComponent } from './zone-history/zone-history.component';
import { ReleaseNoteComponent } from './release-note/release-note.component';
import { CodeComponent } from './code/code.component';
import { PSelectAutosizerDirective } from './util/p-select-autosizer.directive';
import { appConfig } from './mytheme';

@NgModule({
  declarations: [
    AddClockDialogComponent,
    AppComponent,
    ClocksComponent,
    PSelectAutosizerDirective,
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
    FormsModule,
    IconField,
    InputIcon,
    InputTextModule,
    RadioButtonModule,
    RippleModule,
    SelectModule,
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
