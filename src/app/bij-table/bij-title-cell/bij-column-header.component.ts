import { Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs/Subject';
import { BijTitleCellDirective } from './bij-title-cell.directive';
import { SortDirection } from './sort-direction.enum';

@Component({
  selector: 'bij-column-header',
  templateUrl: './bij-column-header.component.html',
  styleUrls: ['./bij-column-header.component.scss']
})
export class BijColumnHeaderComponent implements OnDestroy {

  private _destroy$ = new Subject<void>();
  private _filterField: HTMLElement;

  /**
   * Enable or disable filtering
   */
  @Input()
  public filter = true;

  /**
   * Enable or disable sorting
   */
  @Input()
  public sort = true;

  @ViewChild('filter_field')
  private set filterField(filterField: ElementRef) {
    this._filterField = filterField && filterField.nativeElement as HTMLElement;
  }

  public filterControl = new FormControl();

  constructor(private _titleCell: BijTitleCellDirective) {
    this.filterControl.valueChanges
      .takeUntil(this._destroy$)
      .debounceTime(50)
      .distinctUntilChanged()
      .subscribe(text => _titleCell.filter = text);
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
  }

  public onSort(event: MouseEvent): void {
    if (this.sortDirection && this.sortDirection === SortDirection.Descending) {
      this._titleCell.sort = null;
      return;
    }

    this._titleCell.sort = {
      direction: ((!this.sortDirection) ? SortDirection.Ascending : SortDirection.Descending),
      multi: event.ctrlKey
    };
  }

  public onActivateFilter(): void {
    if (this._filterField) {
      this._filterField.focus();
    }
  }

  public get sortButtonIcon(): string {
    if (this.sortDirection === null) {
      return 'sort_by_alpha';
    }
    return (this.sortDirection === SortDirection.Ascending ? 'keyboard_arrow_up' : 'keyboard_arrow_down');
  }

  private get sortDirection(): SortDirection {
    return this._titleCell.sortDirection;
  }
}
