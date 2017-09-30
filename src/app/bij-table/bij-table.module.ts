import './rxjs-import';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ReactiveFormsModule } from '@angular/forms';
import { BijCellDirective } from './bij-cell';
import { BijDimensionDirective } from './bij-dimension.directive';
import { BijHeaderDirective } from './bij-header/bij-header.directive';
import { BijTrHeadDirective } from './bij-header/bij-tr-head.directive';
import { BijRowDirective } from './bij-row';
import { BijTrDirective } from './bij-row/bij-tr.directive';
import { BijScrollbarComponent } from './bij-scrolling/bij-scrollbar/bij-scrollbar.component';
import { BijHorizontalTouchScrollSupportDirective } from './bij-scrolling/bij-touch-scroll-support/bij-horizontal-touch-scroll-support.directive';
import { BijVerticalTouchScrollSupportDirective } from './bij-scrolling/bij-touch-scroll-support/bij-vertical-touch-scroll-support.directive';
import { BijVerticalWheelScrollSupportDirective } from './bij-scrolling/bij-wheel-scroll-support/bij-vertical-wheel-scroll-support.directive';
import { BijTableComponent } from './bij-table.component';
import { BijTemplateOutletDirective } from './bij-template-outlet.directive';
import { BijColumnHeaderComponent } from './bij-title-cell/bij-column-header.component';
import { BijThDirective } from './bij-title-cell/bij-th.directive';
import { BijTitleCellDirective } from './bij-title-cell/bij-title-cell.directive';

@NgModule({
  declarations: [
    BijCellDirective,
    BijColumnHeaderComponent,
    BijHeaderDirective,
    BijHorizontalTouchScrollSupportDirective,
    BijRowDirective,
    BijScrollbarComponent,
    BijTableComponent,
    BijThDirective,
    BijTitleCellDirective,
    BijTrDirective,
    BijTrHeadDirective,
    BijVerticalTouchScrollSupportDirective,
    BijVerticalWheelScrollSupportDirective,
    BijDimensionDirective,
    BijTemplateOutletDirective
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  exports: [
    BijCellDirective,
    BijColumnHeaderComponent,
    BijHeaderDirective,
    BijRowDirective,
    BijTableComponent,
    BijTitleCellDirective,
    BijThDirective,
    BijTrDirective,
    BijTrHeadDirective
  ]
})
export class BijTableModule {
}
