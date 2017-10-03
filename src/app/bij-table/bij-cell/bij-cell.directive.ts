import { ContentChild, Directive, TemplateRef } from '@angular/core';
import { FilterFn, textFilterFn } from '../bij-title-cell/bij-title-cell.directive';
import { BijUtils } from '../bij.utils';

/**
 * Represents a table cell and is similar to the HTML <td> element.
 *
 * Provide a visual cell representation in the form of inner content enclosed in a <ng-template>.
 * The <ng-template> indicates an instantiation boundary, and no assumptions about number of times or when the template would be instantiated can be made.
 *
 * This modelling directive will not be projected into the DOM, so do not style this element, nor install any event listeners.
 *
 * Example usage:
 *
 * <bij-row *ngFor="let person of persons">
 *   <bij-cell>
 *     <ng-template><b>{{person.firstname}}</b></ng-template>
 *   </bij-cell>
 *   <bij-cell>
 *     <ng-template>{{person.lastname}}</ng-template>
 *   </bij-cell>
 * </bij-row>
 */
@Directive({
  selector: 'bij-cell' // tslint:disable-line:directive-selector
})
export class BijCellDirective {

  private _templateRef: TemplateRef<any>;

  @ContentChild(TemplateRef)
  private set template(templateRef: TemplateRef<any>) {
    this._templateRef = BijUtils.assertTruthy(templateRef, '<bij-cell> requires a template as its DOM child');
  }

  /**
   * Returns the content of this directive in the form of a template.
   */
  public get templateRef(): TemplateRef<any> {
    return this._templateRef;
  }

  /**
   * Returns a function to retrieve the rendered text.
   */
  public get textFn(): () => string {
    return (): string => {
      const view = this._templateRef.createEmbeddedView(null);
      view.detectChanges();
      return BijUtils.text(view);
    };
  }

  /**
   * Tests if this cell matches the specified filter term.
   *
   * @param filterRegExp the regular expression to test this cell for a match.
   * @param filterFn {FilterFn} to extract the cell value from the specified element to match the filter term.
   *        If not set, {textFilterFn} is used to match against the cell's displayed value.
   * @param element the element which represents the row of this cell, and which is used to extract this cell's value.
   * @return {boolean} true for a positive match, or false otherwise.
   *
   * TODO consider setting default filter function directly on BijTitleCellDirective
   */
  public matchesFilter(filterRegExp: RegExp, filterFn: FilterFn | null, element: any): boolean {
    return (filterFn || textFilterFn)(element, this.textFn, filterRegExp);
  }
}
