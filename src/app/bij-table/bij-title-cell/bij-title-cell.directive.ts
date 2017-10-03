import { ContentChild, Directive, Input, OnDestroy, TemplateRef } from '@angular/core';
import { BijUtils } from 'app/bij-table/bij.utils';
import { Subject } from 'rxjs/Subject';
import { TableModel } from '../model/table.model';
import { ColumnSortCriterion } from './column-sort-setting';
import { SortDirection } from './sort-direction.enum';

/**
 * Represents a column header and is similar to the HTML <th> element.
 *
 * It provides the API to sort and filter table rows on behalf of this column's cells.
 *
 * Provide a visual header representation in the form of inner content enclosed in a <ng-template>.
 * The <ng-template> indicates an instantiation boundary, and no assumptions about number of times or when the template would be instantiated can be made.
 *
 * To access this directive's API to control sorting and filtering, it can be constructor injected.
 *
 * The component {BijColumnHeaderComponent} provides a ready to go implementation of a column header.
 *
 * This modelling directive will not be projected into the DOM, so do not style this element, nor install any event listeners.
 * Instead, provide your custom template for HTML <th> tag via 'thTemplateRef' input property.
 *
 * Example usage:
 *
 * <bij-header>
 *   <bij-title-cell>
 *     <ng-template>firstname</ng-template>
 *   </bij-title-cell>
 *   <bij-title-cell>
 *     <ng-template><bij-column-header>lastname</bij-column-header></ng-template>
 *   </bij-title-cell>
 * </bij-header>
 */
@Directive({
  selector: 'bij-title-cell' // tslint:disable-line:directive-selector
})
export class BijTitleCellDirective implements OnDestroy {

  private _destroy$ = new Subject<void>();

  private _templateRef: TemplateRef<any>;

  private _filterRegExp: RegExp;
  private _sortDirection: SortDirection;
  private _sortOrder: number | null = null;

  /**
   * Specifies an optional {TemplateRef} which is rendered as this title cell's HTML <th> tag.
   *
   * A custom template allows to decorate the <th> element, like to set CSS classes, or to install event listeners.
   *
   * The template must fulfill the following requirements:
   *   - provide an empty 'ng-template' as its DOM child, which acts as the anchor where the title cell template is inserted
   *   - apply [bijTh] directive to the <th> element, with the implicit template variable as its value
   *   - declare the template within the corresponding <bij-table> tag
   *
   * The template is given the implicit template variable {ThData} to access the associated 'cell' and 'cellIndex'.
   *
   * Example usage:
   *
   *   <bij-title-cell [thTemplateRef]="th_template">
   *     <ng-template>...</ng-template>
   *   </bij-row>
   *
   *   <ng-template #th_template let-thData>
   *     <th [bijTh]="thData"><ng-template></ng-template></th>
   *   </ng-template>
   */
  @Input()
  public thTemplateRef: TemplateRef<any>;

  @ContentChild(TemplateRef)
  private set template(templateRef: TemplateRef<any>) {
    this._templateRef = BijUtils.assertTruthy(templateRef, '<bij-title-cell> requires a template as its DOM child');
  }

  /**
   * Specifies the filter function used to determine if a cell matches the filter term.
   *
   * If not set, {textFilterFn} is used, which extracts the displayed text content in order to evaluate the filter expression.
   * If set, also provide the element (which represents a row) via {BijRowDirective.element} input value.
   *
   * For performance reasons, consider to provide your own filter function to evaluate filter expressions directly on
   * your element's attributes. This further allows to filter for 'tags' which are not part of the displayed text.
   */
  @Input()
  public filterFn: FilterFn;

  /**
   * Sets the specified column filter term.
   */
  @Input()
  public set filter(filter: string) {
    this._filterRegExp = BijUtils.toFilterRegExp(filter);
    this._tableModel.notifyFilterChange();
  }

  /**
   * Specifies the comparator function used for sorting.
   *
   * If not set, {textCompareFn} is used, which compares the displayed text content.
   *
   * For performance reasons, consider to provide your own compare function to evaluate comparison directly on your element's attributes.
   */
  @Input()
  public compareFn: CompareFn;

  /**
   * Sorts table rows by this column according to the given sort criterion.
   * The criterion allows to specify the sort direction, and whether to sort by multiple columns.
   *
   * If a {CompareFn} is configured, the table rows are sorted according to that function, or by the displayed text content otherwise.
   */
  @Input()
  public set sort(sortCriterion: ColumnSortCriterion) {
    if (sortCriterion && !sortCriterion.multi) {
      this._tableModel.notifySortClear();
    }

    if (!sortCriterion) {
      this._sortDirection = null;
      this._sortOrder = null;
    } else {
      this._sortDirection = sortCriterion.direction;
      this._sortOrder = this._sortOrder || new Date().getTime();
    }

    this._tableModel.notifySortChange();
  }

  constructor(private _tableModel: TableModel) {
    this._tableModel.sortClear$
      .takeUntil(this._destroy$)
      .subscribe(() => {
        this._sortDirection = null;
        this._sortOrder = null;
      });
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
  }

  /**
   * Returns the content of this directive in the form of a template.
   */
  public get templateRef(): TemplateRef<any> {
    return this._templateRef;
  }

  /**
   * Returns the column filter, or null if not set.
   */
  public get filterRegExp(): RegExp {
    return this._filterRegExp || null;
  }

  /**
   * Returns the column sort direction, or null if not sorted by this column.
   */
  public get sortDirection(): SortDirection {
    return this._sortDirection || null;
  }

  /**
   * Returns the column sort order, or null if not sorted by this column.
   */
  public get sortOrder(): number {
    return this._sortOrder || null;
  }
}

/**
 * TODO Also provide filter-text and not only the filter-regex.
 *
 * Function to determine if a cell of this column matches a filter term.
 *
 * @param the element under test
 * @param the rendered text content
 * @param the filter term to match the cell
 */
export declare type FilterFn = (element: any, textFn: () => string, filter: RegExp) => boolean;

/**
 * Function to compare the sort order of two cells of this column.
 *  0: cell1 = cell2
 * -1: cell1 < cell2
 * +1: cell1 > cell2
 */
export declare type CompareFn = (element1: any, element2: any, text1Fn: () => string, text2Fn: () => string) => number;

/**
 * Default filter function which extracts the displayed cell content in order to evaluate the filter expression.
 */
export const textFilterFn: FilterFn = (element: any, textFn: () => string, filter: RegExp): boolean => {
  const text = textFn();
  return text && !!text.match(filter);
};

export const textCompareFn: CompareFn = (element1: any, element2: any, text1Fn: () => string, text2Fn: () => string): number => {
  return (text1Fn() || '' ).localeCompare(text2Fn() || '');
};
