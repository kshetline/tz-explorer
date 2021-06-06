import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DigitSequenceEditorComponent } from './digit-sequence-editor/digit-sequence-editor.component';

@NgModule({
  declarations: [
    AppComponent,
    DigitSequenceEditorComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
