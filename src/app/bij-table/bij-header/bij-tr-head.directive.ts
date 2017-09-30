import { ContentChild, Directive, Input, OnChanges, SimpleChanges, TemplateRef, ViewContainerRef, ViewRef } from '@angular/core';
import { BijUtils } from '../bij.utils';
import { BijHeaderDirective } from './bij-header.directive';

/**
 * Directive to be applied on HTML <TR> elements of {BijTableComponent} header.
 *
 * This directive must be given an instance of {TrHeadData} as its input value.
 */
@Directive({selector: 'tr[bijTrHead]'})
export class BijTrHeadDirective implements OnChanges {

  private _viewRef: ViewRef;
  private _anchor: ViewContainerRef;

  @Input('bijTrHead') // tslint:disable-line:no-input-rename
  public data: TrHeadData;

  @ContentChild(TemplateRef, { read: ViewContainerRef })
  private set anchor(anchor: ViewContainerRef) {
    this._anchor = BijUtils.assertTruthy(anchor, `<tr> requires an anchor in the form of an empty 'ng-template' element as its DOM child`);
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (this._viewRef) {
      this._anchor.remove(this._anchor.indexOf(this._viewRef));
    }
    this._viewRef = this._anchor.createEmbeddedView(this.data.childTemplateRef, null);
  }
}

export interface TrHeadData {
  header: BijHeaderDirective;
  childTemplateRef: TemplateRef<any>;
}
