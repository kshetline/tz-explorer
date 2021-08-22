import { HttpClientJsonpModule, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { RadioButtonModule } from 'primeng/radiobutton';
import { RippleModule } from 'primeng/ripple';
import { TabViewModule } from 'primeng/tabview';

import { TubularNgWidgetsModule } from '@tubular/ng-widgets';

import { AddClockDialogComponent } from './add-clock-dialog/add-lock-dialog.component';
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

@NgModule({
  declarations: [
    AddClockDialogComponent,
    AppComponent,
    ClocksComponent,
    PDropdownFixDirective,
    TimezoneSelectorComponent,
    DownloadsComponent
  ],
  imports: [
    AppRoutingModule,
    AutoCompleteModule,
    BrowserModule,
    BrowserAnimationsModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
    FormsModule,
    HttpClientJsonpModule,
    HttpClientModule,
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
export class AppModule {}
