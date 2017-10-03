import { ContentChildren, Directive, Input, QueryList, TemplateRef } from '@angular/core';

import { BijCellDirective } from '../bij-cell';
import { HeaderInfo } from '../bij-header/bij-header.directive';

/**
 * Represents a table row and is similar to the HTML <tr> element.
 *
 * The row can be bound to the domain object, which represents the row, via 'element' input property.
 * This allows to implement custom filtering and sorting based on the domain object properties.
 *
 * This modelling directive will not be projected into the DOM, so do not style this element, nor install any event listeners.
 * Instead, provide your custom template for HTML <tr> tag via 'trTemplateRef' input property.
 *
 * Example usage:
 *
 * <bij-row *ngFor="let person of persons" [element]="person">
 *   <bij-cell>
 *     <ng-template>{{person.firstname}}</ng-template>
 *   </bij-cell>
 *   <bij-cell>
 *     <ng-template>{{person.lastname}}</ng-template>
 *   </bij-cell>
 * </bij-row>
 */
@Directive({
  selector: 'bij-row' // tslint:disable-line:directive-selector
})
export class BijRowDirective {

  @ContentChildren(BijCellDirective)
  public cells: QueryList<BijCellDirective>;

  /**
   * Specifies the domain object which is represented by this row.
   *
   * This allows to select a row by its domain object, or to scroll a row into the viewport by its domain object.
   *
   * Further, when associating a domain object with the row, this allows to compute the row identity by specifying a {TrackByFunction},
   * or to apply custom filtering by specifying a {FilterFn}, or to implement custom sorting by specifying a {CompareFn}.
   *
   * See {BijTableComponent} to provide a {TrackByFunction}, or {BijTitleCellDirective} to provide a {FilterFn} or {CompareFn}.
   */
  @Input()
  public element: any;

  /**
   * Specifies an optional {TemplateRef} which is rendered as this row's HTML <tr> tag.
   *
   * A custom template allows to decorate the <tr> element, like to set CSS classes, or to install event listeners.
   *
   * The template must fulfill the following requirements:
   *   - provide an empty 'ng-template' as its DOM child, which acts as the anchor where its <td> children are inserted
   *   - apply [bijTr] directive to the <tr> element, with the implicit template variable as its value
   *   - declare the template within the corresponding <bij-table> tag
   *
   * The template is given the implicit template variable {TrData} to access the associated 'row' and 'rowIndex'.
   *
   * Example usage:
   *
   *   <bij-row [trTemplateRef]="tr_template">
   *     <bij-cell>...</bij-cell>
   *     <bij-cell>...</bij-cell>
   *   </bij-row>
   *
   *   <ng-template #tr_template let-trData>
   *     <tr [bijTr]="trData"><ng-template></ng-template></tr>
   *   </ng-template>
   */
  @Input()
  public trTemplateRef: TemplateRef<any>;

  public cell(columnIndex: number): BijCellDirective {
    return this.cells.toArray()[columnIndex];
  }

  /**
   * Tests if this row matches the specified filter criteria.
   */
  public matches(tableFilterRegExp: RegExp, headerInfo: HeaderInfo): boolean {
    return this.matchesTableFilter(tableFilterRegExp, headerInfo) && this.matchesColumnFilters(headerInfo);
  }

  private matchesTableFilter(tableFilterRegExp: RegExp, headerInfo: HeaderInfo): boolean {
    return !tableFilterRegExp || this.cells.some((cell, columnIndex) => {
      const filterFn = headerInfo.filterFns[columnIndex];
      return cell.matchesFilter(tableFilterRegExp, filterFn, this.element);
    });
  }

  private matchesColumnFilters(headerInfo: HeaderInfo): boolean {
    return !headerInfo.hasColumnFilters || this.cells.toArray().every((cell, columnIndex) => {
      const filterRegExp = headerInfo.filterRegExps[columnIndex];
      const filterFn = headerInfo.filterFns[columnIndex];
      return !filterRegExp || cell.matchesFilter(filterRegExp, filterFn, this.element);
    });
  }
}
