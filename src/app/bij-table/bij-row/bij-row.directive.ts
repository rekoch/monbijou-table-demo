import { ContentChildren, Directive, Input, QueryList, TemplateRef } from '@angular/core';

import { BijCellDirective } from '../bij-cell';
import { HeaderInfo } from '../bij-header/bij-header.directive';

/**
 * Represents a row in {BijTableComponent}.
 */
@Directive({
  selector: 'bij-row' // tslint:disable-line:directive-selector
})
export class BijRowDirective {

  @ContentChildren(BijCellDirective)
  public cells: QueryList<BijCellDirective>;

  /**
   * Specifies the business object which is represented by this row.
   *
   * This allows to select a row by its business object, or to scroll a row into the viewport by its business object.
   *
   * Further, when associating a business object with the row, this allows to compute the row identity by specifying a {TrackByFunction},
   * or to apply custom filtering by specifying a {FilterFn}, or to implement custom sorting by specifying a {ComparatorFn}.
   *
   * See {BijTableComponent} to provide a {TrackByFunction}, or {BijTitleCellDirective} to provide a {FilterFn} or {ComparatorFn}.
   */
  @Input()
  public element: any;

  /**
   * Specifies an optional {TemplateRef} which is rendered as this row's HTML <TR> tag.
   *
   * A custom template allows to decorate the <TR> element, like to set CSS classes, or to install event listeners.
   *
   * The template must fulfill the following requirements:
   *   - provide an empty 'ng-template' as its DOM child, which acts as the anchor where its <TD> children are inserted
   *   - apply [bijTr] directive to the <TR> element, with the implicit template variable as its value
   *   - declare the template within the corresponding <bij-table> tag
   *
   * See the example below.
   *
   * The template is given the implicit template variable {TrData} to access the associated 'row' and 'rowIndex'.
   *
   * ----
   * Example:
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
