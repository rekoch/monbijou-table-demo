import { AfterViewInit, ContentChildren, Directive, Input, IterableDiffer, IterableDiffers, OnDestroy, QueryList, TemplateRef } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { BijTitleCellDirective, CompareFn, FilterFn, textCompareFn } from '../bij-title-cell/bij-title-cell.directive';
import { SortDirection } from '../bij-title-cell/sort-direction.enum';
import { TableModel } from '../model/table.model';

@Directive({
  selector: 'bij-header'  // tslint:disable-line:directive-selector
})
export class BijHeaderDirective implements AfterViewInit, OnDestroy {

  private _differ: IterableDiffer<BijTitleCellDirective>;
  private _destroy$ = new Subject<void>();

  @ContentChildren(BijTitleCellDirective)
  public titleCells: QueryList<BijTitleCellDirective> = new QueryList<BijTitleCellDirective>();

  /**
   * Specifies whether to display the header row. By default, the header is visible.
   *
   * If set to false, this has the same effect as not model the header row at all,
   * but still allows you to specify {FilterFn} in {BijTitleCellComponent} to control filtering.
   */
  @Input()
  public visible = true;

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
   * The template is given the implicit template variable {TrHeadData} to access the associated 'header'.
   *
   * ----
   * Example:
   *
   *   <bij-header [trTemplateRef]="tr_head_template">
   *     <bij-title-cell>...</bij-title-cell>
   *     <bij-title-cell>...</bij-title-cell>
   *   </bij-header>
   *
   *   <ng-template #tr_head_template let-trHeadData>
   *     <tr [bijTrHead]="trHeadData"><ng-template></ng-template></tr>
   *   </ng-template>
   */
  @Input()
  public trTemplateRef: TemplateRef<any>;

  constructor(private _tableModel: TableModel, differs: IterableDiffers) {
    this._differ = differs.find([]).create();
  }

  public ngAfterViewInit(): void {
    this.titleCells.changes
      .startWith(this.titleCells) // initial cells
      .takeUntil(this._destroy$)
      .subscribe((titleCells: BijTitleCellDirective[]) => {
        const changes = this._differ.diff(titleCells);
        if (changes) {
          this._tableModel.notifyColumnChange();
        }
      });
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
  }

  /**
   * Returns an object with information about the current filtering and sorting state.
   */
  public get headerInfo(): HeaderInfo {
    return this.titleCells
      .reduce((info: HeaderInfo, titleCell: BijTitleCellDirective, columnIndex: number) => {
        return {
          hasColumnFilters: info.hasColumnFilters || !!titleCell.filterRegExp,
          filterRegExps: [...info.filterRegExps, titleCell.filterRegExp],
          filterFns: [...info.filterFns, titleCell.filterFn],
          sortColumns: [...info.sortColumns, {
            order: titleCell.sortOrder,
            direction: titleCell.sortDirection,
            compareFn: titleCell.compareFn || textCompareFn,
            columnIndex: columnIndex
          } as SortColumn]
            .filter(sortColumn => !!sortColumn.order && !!sortColumn.direction)
            .sort((sortColumn1: SortColumn, sortColumn2: SortColumn) => sortColumn1.order - sortColumn2.order)
        };
      }, {
        hasColumnFilters: false,
        filterRegExps: [],
        filterFns: [],
        sortColumns: []
      } as HeaderInfo);
  }
}

/**
 * Represents information about filtering and sorting.
 */
export interface HeaderInfo {
  hasColumnFilters: boolean;
  filterRegExps: RegExp[];
  filterFns: FilterFn[];
  /**
   * Returns the sort columns ordered by sort order.
   */
  sortColumns: SortColumn[];
}

export interface SortColumn {
  columnIndex: number;
  order: number;
  compareFn: CompareFn;
  direction: SortDirection;
}
