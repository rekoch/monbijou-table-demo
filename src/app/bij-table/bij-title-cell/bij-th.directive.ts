import { ContentChild, Directive, Input, OnChanges, SimpleChanges, TemplateRef, ViewContainerRef, ViewRef } from '@angular/core';
import { BijUtils } from '../bij.utils';
import { BijTitleCellDirective } from './bij-title-cell.directive';

/**
 * Directive to be applied on HTML <th> elements of {BijTableComponent}.
 *
 * This directive must be given an instance of {ThData} as its input value.
 */
@Directive({selector: 'th[bijTh]'})
export class BijThDirective implements OnChanges {

  private _viewRef: ViewRef;
  private _anchor: ViewContainerRef;

  @Input('bijTh') // tslint:disable-line:no-input-rename
  public data: ThData;

  @ContentChild(TemplateRef, { read: ViewContainerRef })
  private set anchor(anchor: ViewContainerRef) {
    this._anchor = BijUtils.assertTruthy(anchor, `<th> requires an anchor in the form of an empty 'ng-template' element as its DOM child`);
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (this._viewRef) {
      this._anchor.remove(this._anchor.indexOf(this._viewRef));
    }
    this._viewRef = this._anchor.createEmbeddedView(this.data.cell.templateRef, null);
  }
}

export interface ThData {
  cell: BijTitleCellDirective,
  cellIndex: number
}
