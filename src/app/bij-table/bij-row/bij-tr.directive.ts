import { ContentChild, Directive, HostBinding, Input, OnChanges, SimpleChanges, TemplateRef, ViewContainerRef, ViewRef } from '@angular/core';
import { BijTableComponent } from '../bij-table.component';
import { BijUtils } from '../bij.utils';
import { BijRowDirective } from './bij-row.directive';

/**
 * Directive to be applied on HTML <tr> elements of {BijTableComponent}.
 *
 * This directive must be given an instance of {TrData} as its input value.
 */
@Directive({selector: 'tr[bijTr]'})
export class BijTrDirective implements OnChanges {

  private _viewRef: ViewRef;
  private _anchor: ViewContainerRef;

  @Input('bijTr') // tslint:disable-line:no-input-rename
  public data: TrData;

  @ContentChild(TemplateRef, { read: ViewContainerRef })
  private set anchor(anchor: ViewContainerRef) {
    this._anchor = BijUtils.assertTruthy(anchor, `<tr> requires an anchor in the form of an empty 'ng-template' element as its DOM child`);
  }

  @HostBinding('class.display-none')
  public get cssClassDisplayNone(): boolean {
    return this._tableComponent.isGestureActive() && this.data.gestureSourceRow;
  }

  @HostBinding('class.hidden')
  public get cssClassHidden(): boolean {
    return this._tableComponent.initializingTableScrollModel;
  }

  constructor(private _tableComponent: BijTableComponent) {
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (this._viewRef) {
      this._anchor.remove(this._anchor.indexOf(this._viewRef));
    }
    this._viewRef = this._anchor.createEmbeddedView(this.data.childTemplateRef, null);
  }
}

export interface TrData {
  row: BijRowDirective;
  rowIndex: number;
  childTemplateRef: TemplateRef<any>;
  /**
   * Indicates whether the associated row is a potential gesture source, and which must not be removed nor modified while the gesture takes place.
   */
  gestureSourceRow: boolean;
}
