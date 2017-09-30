import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { BijTableModule } from './bij-table/bij-table.module';
import { CompareTableComponent } from './compare-table/compare-table.component';

@NgModule({
  declarations: [
    AppComponent,
    CompareTableComponent
  ],
  imports: [
    BijTableModule,
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
