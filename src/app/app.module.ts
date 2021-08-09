import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { RadioButtonModule } from 'primeng/radiobutton';
import { RippleModule } from 'primeng/ripple';
import { TubularNgWidgetsModule } from '@tubular/ng-widgets';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { TimezoneSelectorComponent } from './timezone-selector/timezone-selector.component';

@NgModule({
  declarations: [
    AppComponent,
    TimezoneSelectorComponent
  ],
  imports: [
    AppRoutingModule,
    BrowserModule,
    BrowserAnimationsModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
    FormsModule,
    RadioButtonModule,
    RippleModule,
    TubularNgWidgetsModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
