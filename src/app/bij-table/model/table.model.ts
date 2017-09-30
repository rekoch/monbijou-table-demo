import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { BijHeaderDirective, HeaderInfo, SortColumn } from '../bij-header/bij-header.directive';
import { BijRowDirective } from '../bij-row/bij-row.directive';
import { SortDirection } from '../bij-title-cell/sort-direction.enum';
import { BijUtils } from '../bij.utils';

/**
 * Represents the internal table of 'bij-table-component'.
 */
@Injectable()
export class TableModel {

  private _tableFilterRegExp: RegExp = null;
  private _rows: BijRowDirective[] = [];
  private _filteredRows: BijRowDirective[] = [];
  private _header: BijHeaderDirective;
  private _filterChange$ = new Subject<void>();
  private _sortChange$ = new Subject<void>();
  private _sortClear$ = new Subject<void>();
  private _columnChange$ = new Subject<void>();

  /**
   * Applies the specified filter to all table cells.
   */
  public setTableFilter(filter: string): void {
    this._tableFilterRegExp = BijUtils.toFilterRegExp(filter);
    this.invalidate();
  }

  /**
   * Returns all rows matching the filter text, or all rows if no filter is specified.
   */
  public get filteredRows(): BijRowDirective[] {
    return this._filteredRows;
  }

  public addRow(row: BijRowDirective, invalidate: boolean): void {
    this._rows.push(row);
    if (invalidate) {
      this.invalidate();
    }
  }

  public removeRow(row: BijRowDirective, invalidate: boolean): void {
    const index = this._rows.indexOf(row);
    this._rows.splice(index, 1);
    if (invalidate) {
      this.invalidate();
    }
  }

  public setHeader(header: BijHeaderDirective): void {
    this._header = header;
    this.invalidate();
  }

  public get header(): BijHeaderDirective {
    return this._header;
  }

  public get filteredRowCount(): number {
    return this.filteredRows.length;
  }

  /**
   * Notifies about column filter changes.
   */
  public get filterChange$(): Observable<void> {
    return this._filterChange$.asObservable();
  }

  public notifyFilterChange(): void {
    this._filterChange$.next();
  }

  /**
   * Notifies about sort order changes.
   */
  public get sortChange$(): Observable<void> {
    return this._sortChange$.asObservable();
  }

  public notifySortChange(): void {
    this._sortChange$.next();
  }

  public get sortClear$(): Observable<void> {
    return this._sortClear$.asObservable();
  }

  public notifySortClear(): void {
    this._sortClear$.next();
  }

  /**
   * Notifies if a column is added or removed.
   */
  public get columnChange$(): Observable<void> {
    return this._columnChange$.asObservable();
  }

  public notifyColumnChange(): void {
    this._columnChange$.next();
  }

  /**
   * Computes the effective rows according to the sort order and filter criteria.
   */
  public invalidate(): void {
    const headerInfo: HeaderInfo = this.header && this.header.headerInfo || {
        hasColumnFilters: false,
        filterRegExps: [],
        filterFns: [],
        sortColumns: []
      };

    // Define function to filter rows
    const filterFn = (rows: BijRowDirective[]): BijRowDirective[] => {
      if (!this._tableFilterRegExp && !headerInfo.hasColumnFilters) {
        return rows;
      }
      return rows.filter(row => row.matches(this._tableFilterRegExp, headerInfo));
    };

    // Define function to sort rows
    const sortFn = (rows: BijRowDirective[]): BijRowDirective[] => {
      if (headerInfo.sortColumns.length === 0) {
        return rows;
      }
      return rows.sort(TableModel.rowComparator(headerInfo.sortColumns));
    };

    this._filteredRows = sortFn(filterFn([...this._rows]));
  }

  private static rowComparator(sortColumns: SortColumn[]): (row1: BijRowDirective, row2: BijRowDirective) => number {
    return (row1: BijRowDirective, row2: BijRowDirective): number => {
      for (const sortColumn of sortColumns) {
        const comparison = sortColumn.compareFn(row1.element, row2.element, row1.cell(sortColumn.columnIndex).textFn, row2.cell(sortColumn.columnIndex).textFn);
        if (comparison === 0) {
          continue; // ask the next sort column to decide row ordering
        }
        const ascending = sortColumn.direction === SortDirection.Ascending;
        return ascending ? comparison : -comparison;
      }
      return 0;
    };
  }
}
