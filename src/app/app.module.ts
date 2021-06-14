import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DigitSequenceEditorComponent } from './digit-sequence-editor/digit-sequence-editor.component';
import { TimeEditorComponent } from './time-editor/time-editor.component';

@NgModule({
  declarations: [
    AppComponent,
    DigitSequenceEditorComponent,
    TimeEditorComponent
  ],
  imports: [
    AppRoutingModule,
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
