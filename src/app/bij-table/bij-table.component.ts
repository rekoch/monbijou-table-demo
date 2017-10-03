import { AfterViewInit, ChangeDetectorRef, Component, ContentChild, ContentChildren, ElementRef, EventEmitter, Input, IterableDiffer, IterableDiffers, OnDestroy, Output, QueryList, TemplateRef, ViewChild } from '@angular/core';

import { Subject } from 'rxjs/Subject';
import { Dimension } from './bij-dimension.directive';
import { BijHeaderDirective } from './bij-header/bij-header.directive';
import { TrHeadData } from './bij-header/bij-tr-head.directive';
import { BijRowDirective } from './bij-row/bij-row.directive';
import { TrData } from './bij-row/bij-tr.directive';
import { TouchScrollEventSource } from './bij-scrolling/bij-touch-scroll-support/touch-scroll-event-source.enum';
import { TouchScrollConfig } from './bij-scrolling/bij-touch-scroll-support/touch-scroll.config';
import { TouchScrollEvent } from './bij-scrolling/bij-touch-scroll-support/touch-scroll.event';
import { WheelScrollEvent } from './bij-scrolling/bij-wheel-scroll-support/wheel-scroll.event';
import { ScrollDirection } from './bij-scrolling/scroll-direction.enum';
import { ThData } from './bij-title-cell/bij-th.directive';
import { BijTitleCellDirective } from './bij-title-cell/bij-title-cell.directive';
import { TableScrollModel } from './model/table-scroll.model';
import { TableModel } from './model/table.model';
import { ViewportChangeAction, ViewportChangeEvent } from './viewport-change.event';

/**
 * Angular table component on the basis of the native HTML table element.
 *
 * Table structure and its data rows are modelled in the template similar to model a native HTML table.
 * The model is projected into standard HTML table tags. However, only the rows visible in the viewport are
 * actually rendered into the DOM.
 *
 * It features the following functionality:
 * - virtual scrolling
 * - support for infinite scrolling
 * - filtering
 * - sorting
 *
 * Changes to the modelling structure are instantly detected. This allows for straight-forward
 * implementation of responsive design by using Angular structural directives like *ngIf to adapt
 * the column structure on dimension change.
 *
 * Cell content is specified in the form of a <ng-template>, and allows the usage of arbitrary HTML code.
 * The <ng-template> indicates an instantiation boundary, and no assumptions about number of times or when the template would be instantiated can be made.
 *
 * Domain objects can be bound to their respective rows to facilitate interaction and to implement custom
 * filtering and sorting.
 *
 * Due to limitation of HTML table, vertical scrolling works with discrete row steps, which may not be optimal
 * for tall rows.
 *
 * Example usage:
 *
 *   <bij-table>
 *     <bij-header>
 *       <bij-title-cell><ng-template>Firstname</ng-template></bij-title-cell>
 *       <bij-title-cell><ng-template>Lastname</ng-template></bij-title-cell>
 *     </bij-header>
 *
 *     <bij-row *ngFor="let person of persons">
 *       <bij-cell><ng-template>{{person.firstname}}</ng-template></bij-cell>
 *       <bij-cell><ng-template>{{person.lastname}}</ng-template></bij-cell>
 *     </bij-row>
 *   </bij-table>
 */
@Component({
  selector: 'bij-table',
  templateUrl: './bij-table.component.html',
  styleUrls: ['./bij-table.component.scss'],
  providers: [TableModel]
})
export class BijTableComponent implements AfterViewInit, OnDestroy {

  private _differ: IterableDiffer<BijRowDirective>;
  private _destroy$ = new Subject<void>();
  private _stopVerticalSwipeScrolling$ = new Subject<void>();
  private _stopHorizontalSwipeScrolling$ = new Subject<void>();

  private _runningUpdateViewport = false;
  private _runningLastRangeComputation = false;

  private _viewportElement: HTMLElement;

  private _startElementIdentity: any;
  private _viewportClientTranslateX = 0;

  private _viewportDimension: Dimension = {
    offsetWidth: 0,
    offsetHeight: 0,
    clientWidth: 0,
    clientHeight: 0
  };
  private _viewportClientDimension: Dimension = {
    offsetWidth: 0,
    offsetHeight: 0,
    clientWidth: 0,
    clientHeight: 0
  };
  private _tableHeadDimension: Dimension = {
    offsetWidth: 0,
    offsetHeight: 0,
    clientWidth: 0,
    clientHeight: 0
  };

  /**
   * During a touch-gesture this array contains a snapshot of all rows which are in the viewport when the gesture started.
   * Since the gesture's touch events are emitted by an element contained in these rows they need to be kept in the DOM
   * until the gesture is completed. Any modification (i.e. moving/removing these rows) would prevent further touch events
   * and corrupt the gesture.
   */
  private _gestureSourceRows: BijRowDirective[] = [];

  @ViewChild('bij_viewport')
  private set viewport(viewport: ElementRef) {
    this._viewportElement = viewport.nativeElement as HTMLElement;
  }

  @ContentChild(BijHeaderDirective)
  private set header(header: BijHeaderDirective) {
    this.tableModel.setHeader(header);
    this.scrollModel.setSize(this.tableModel.filteredRowCount);
    this.scrollModel.setPositionRatio(0);
    this.updateViewport(ViewportChangeAction.HEADER);
  }

  @ContentChildren(BijRowDirective)
  private _rows: QueryList<BijRowDirective>;

  /**
   * Filters all rows which match the specified filter text in any of their cells.
   */
  @Input()
  public set filter(filter: string) {
    this.tableModel.setTableFilter(filter);
    this.scrollModel.setSize(this.tableModel.filteredRowCount);
    this.scrollModel.setPositionRatio(0);
    this.updateViewport(ViewportChangeAction.FILTER);
  }

  /**
   * Function used to determine the element identity.
   *
   * The element identity is used to restore the visible viewport area and to restore
   * the selection upon providing new data with its object references changed.
   *
   * See Angular {TrackByFunction}
   *
   * TODO better documentation: declare it's optional character, explain implications of providing or not providing (functual vs. performance)
   */
  @Input()
  public trackBy: (index: number, row: any) => any;

  /**
   * Emits an event upon a change of the visible client area in the viewport,
   * e.g. when scrolling or resizing the component.
   */
  @Output()
  public viewportChange = new EventEmitter<ViewportChangeEvent>();

  public ScrollDirection = ScrollDirection;
  public scrollModel = new TableScrollModel();

  public get verticalTouchScrollConfig(): TouchScrollConfig {
    return {
      stepSize: 1 / this.rowsInScrollRange.length,
      swipeScrollSpeed: this.scrollModel.scrollSize / this.rowsInScrollRange.length,
      cancelSwipe$: this._stopVerticalSwipeScrolling$.asObservable()
    };
  };

  public get horizontalTouchScrollConfig(): TouchScrollConfig {
    return {
      stepSize: 0,
      swipeScrollSpeed: 1,
      cancelSwipe$: this._stopHorizontalSwipeScrolling$.asObservable()
    };
  };

  constructor(public tableModel: TableModel, differs: IterableDiffers, private _changeDetector: ChangeDetectorRef) {
    this._differ = differs.find([]).create();

    // Listen to column structure changes to invalidate the table model
    this.tableModel.columnChange$
      .takeUntil(this._destroy$)
      .subscribe(this.layout.bind(this));

    // Listen to column filter changes to invalidate the table model
    this.tableModel.filterChange$
      .takeUntil(this._destroy$)
      .subscribe(() => {
        this.tableModel.invalidate();
        this.scrollModel.setSize(this.tableModel.filteredRowCount);
        this.scrollModel.setPositionRatio(0);
        this.updateViewport(ViewportChangeAction.FILTER);
      });

    // Listen to column sort changes to invalidate the table model
    this.tableModel.sortChange$
      .takeUntil(this._destroy$)
      .subscribe(() => {
        this.tableModel.invalidate();
        this.updateViewport(ViewportChangeAction.SORT);
      });
  }

  public ngAfterViewInit(): void {
    this._rows.changes
      .startWith(this._rows) // initial data model
      .takeUntil(this._destroy$)
      .subscribe((rows: BijRowDirective[]) => {
        // Update model upon data change
        const changes = this._differ.diff(rows);
        if (changes) {
          changes.forEachAddedItem(change => this.tableModel.addRow(change.item, false));
          changes.forEachRemovedItem(change => this.tableModel.removeRow(change.item, false));

          this.tableModel.invalidate();
          this.scrollModel.setSize(this.tableModel.filteredRowCount);
          this.scrollToElementIdentity(this._startElementIdentity, false);
          this.updateViewport(ViewportChangeAction.DATA_SOURCE);
        }
      });
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
  }

  public get titleCells(): BijTitleCellDirective[] {
    return this.tableModel.header ? [...this.tableModel.header.titleCells.toArray()] : [];
  }

  /**
   * Returns the rows to be rendered in the viewport.
   *
   * @param sourceRowsIfGesture
   *        'true' to return the gesture source rows instead of the live rows during a touch gesture.
   */
  public getRows(sourceRowsIfGesture: boolean): BijRowDirective[] {
    // TODO Verify how often this method gets called before every Angular version update
    // console.log('rows');
    if (this.isGestureActive() && sourceRowsIfGesture) {
      return this._gestureSourceRows;
    } else {
      return this.rowsInScrollRange;
    }
  }

  public isGestureActive(): boolean {
    return this._gestureSourceRows.length > 0;
  }

  /**
   * Indicates whether {BijTableComponent} is currently initializing the {TableScrollModel},
   * which temporary renders the last rows into the viewport.
   */
  public get initializingTableScrollModel(): boolean {
    return this._runningLastRangeComputation;
  }

  public scrollToElement(element: any): void {
    const rowIndex = this.tableModel.filteredRows.findIndex(row => {
      return row.element && row.element === element;
    });

    if (rowIndex === -1) {
      return;
    }

    this.scrollToRow(rowIndex, true);
  }

  public scrollToElementIdentity(elementIdentity: any, updateViewport: boolean = true): void {
    if (!this.trackBy || !elementIdentity) {
      return;
    }

    const rowIndex = this.tableModel.filteredRows.findIndex((row, idx) => {
      return row.element && this.trackBy(idx, row.element) === elementIdentity;
    });

    if (rowIndex === -1) {
      return;
    }

    this.scrollToRow(rowIndex, updateViewport);
  }

  public scrollToRow(rowIndex: number, updateViewport: boolean = true): void {
    this.scrollModel.setStart(rowIndex);
    if (updateViewport) {
      this.updateViewport(ViewportChangeAction.GOTO);
    }
  }

  public scrollToPosition(position: number): void {
    this.scrollModel.setPositionRatio(position);
    this.updateViewport(ViewportChangeAction.GOTO);
  }

  public onVerticalScroll(distance: number, stopSwipeScrolling: boolean = true): void {
    this.scrollModel.movePosition(distance);
    this.updateViewport(distance < 0 ? ViewportChangeAction.REWIND : ViewportChangeAction.FORWARD);
    if (stopSwipeScrolling) {
      this._stopVerticalSwipeScrolling$.next();
    }
  }

  public onTouchStart(): void {
    this._gestureSourceRows = [...this.rowsInScrollRange];
  }

  public onVerticalTouchScroll(event: TouchScrollEvent): void {
    const clipRatio = this.rowsInScrollRange.length / this.scrollModel.scrollSize;
    const deltaYRatio = event.deltaRatio * (clipRatio);
    const stopSwipeScrolling = event.source === TouchScrollEventSource.Swipe && (this.scrollModel.positionRatio in [0, 1]);
    this.onVerticalScroll(deltaYRatio, stopSwipeScrolling);
  }

  public onTouchEnd(): void {
    this._gestureSourceRows = [];
    this.updateViewport(ViewportChangeAction.LAYOUT);
  }

  public onHorizontalTouchScroll(event: TouchScrollEvent): void {
    const deltaPx = event.deltaRatio * this._viewportClientDimension.offsetWidth;

    if (this.horizontalContentOverflow) {
      this.onHorizontalScroll(deltaPx / this.horizontalScrollWidth);
    }
  }

  public onHorizontalScroll(deltaRatio: number): void {
    const newTranslateX = this._viewportClientTranslateX - (deltaRatio * this.horizontalScrollWidth);
    this._viewportClientTranslateX = this.ensureValidTranslateX(newTranslateX);
    if (this._viewportClientTranslateX === -this.horizontalScrollWidth || this._viewportClientTranslateX === 0) {
      this._stopHorizontalSwipeScrolling$.next();
    }
    this._changeDetector.detectChanges();
  }

  public get transform(): string {
    return `translateX(${this._viewportClientTranslateX}px)`;
  }

  public get verticalScrollbarVisible(): boolean {
    return this.scrollModel.rangeRatio < 1; // Do not delegate to 'isVerticalContentOverflow' because viewport DOM dimension is not applicable during 'updateViewport'.
  }

  /**
   * Whether the content exceeds the viewport width.
   */
  public get horizontalContentOverflow(): boolean {
    return this._viewportClientDimension.offsetWidth > this._viewportDimension.clientWidth;
  }

  public get horizontalScrollThumbSizeRatio(): number {
    return this._viewportDimension.clientWidth / this._viewportClientDimension.offsetWidth;
  }

  public get horizontalScrollThumbPositionRatio(): number {
    return -this._viewportClientTranslateX / this.horizontalScrollWidth;
  }

  public get scrollbarTopPx(): number {
    return this._tableHeadDimension.offsetHeight;
  }

  private get horizontalScrollWidth(): number {
    return this._viewportClientDimension.offsetWidth - this._viewportDimension.clientWidth;
  }

  public onMouseWheel(event: WheelScrollEvent): void {
    const distance = (event.speed / this.tableModel.filteredRowCount);
    this.onVerticalScroll(event.signum * (Math.min(distance, this.scrollModel.rangeRatio)));
  }

  public onArrowUp(): void {
    this.onVerticalScroll(-1 / this.tableModel.filteredRowCount);
  }

  public onArrowDown(): void {
    this.onVerticalScroll(1 / this.tableModel.filteredRowCount);
  }

  public onPageUp(event: KeyboardEvent): void {
    this.onVerticalScroll(-this.scrollModel.rangeRatio);
  }

  public onPageDown(event: KeyboardEvent): void {
    this.onVerticalScroll(this.scrollModel.rangeRatio);
  }

  public onPageHome(event: KeyboardEvent): void {
    this.scrollModel.setPositionRatio(0);
    this.updateViewport(ViewportChangeAction.REWIND);
  }

  public onPageEnd(event: KeyboardEvent): void {
    this.scrollModel.setPositionRatio(1);
    this.updateViewport(ViewportChangeAction.FORWARD);
  }

  public onViewportDimensionChange(dimension: Dimension): void {
    this._viewportDimension = dimension;

    if (this._viewportClientTranslateX) {
      this._viewportClientTranslateX = this.ensureValidTranslateX(this._viewportClientTranslateX);
    }
    this.layout();
  }

  public onViewportClientDimensionChange(dimension: Dimension): void {
    this._viewportClientDimension = dimension;
  }

  public onTableHeadDimensionChange(dimension: Dimension): void {
    this._tableHeadDimension = dimension;
  }

  /**
   * Forces a lay out of modelled columns and rows matching sort order and filter criteria.
   */
  public layout(): void {
    this.tableModel.invalidate(); // in case a filter does not apply anymore
    this.scrollModel.setSize(this.tableModel.filteredRowCount);
    this.scrollModel.clearRange(); // to (re)compute the scrollbar thumb size, e.g. when shrinking the viewport height.
    this.updateViewport(ViewportChangeAction.LAYOUT);
  }

  /**
   * Used in component template for *ngFor when iterating over the rows.
   *
   * Must be a property to explicitly bind the this-reference because not invoked as a class function by Angular during *ngFor.
   */
  public trackByRowFn = (rowIndex: number, row: BijRowDirective): any => {
    const identity = this.trackBy && row && row.element && this.trackBy(rowIndex, row.element);
    return identity || row;
  }; // tslint:disable-line:semicolon

  /**
   * Creates a new {TrHeadData} which is given to 'tr-template' as implicit template variable.
   */
  public newTrHeadData(childTemplateRef: TemplateRef<any>): TrHeadData {
    return {header: this.tableModel.header, childTemplateRef};
  }

  /**
   * Creates a new {ThData} which is given to 'td-template' as implicit template variable.
   */
  public newThData(cell: BijTitleCellDirective, cellIndex: number): ThData {
    return {cell, cellIndex};
  }

  /**
   * Creates a new {TrData} which is given to 'tr-template' as implicit template variable.
   */
  public newTrData(row: BijRowDirective, rowIndex: number, childTemplateRef: TemplateRef<any>, gestureSourceRow: boolean): TrData {
    return {row, rowIndex, childTemplateRef, gestureSourceRow};
  }

  private get rowsInScrollRange(): BijRowDirective[] {
    return this.scrollModel.applyRange(this.tableModel.filteredRows);
  }

  private ensureValidTranslateX(value: number): number {
    let translateX = value;
    translateX = Math.max(translateX, -this.horizontalScrollWidth);
    translateX = Math.min(translateX, 0);
    return translateX;
  }

  /**
   * Populates the viewport with elements according to the current scroll position and triggers change detection.
   *
   * @param viewportChangeAction specifies the cause of the viewport change.
   */
  private updateViewport(viewportChangeAction: ViewportChangeAction): void {
    if (this._runningUpdateViewport) {
      return
    }

    if (this._viewportElement === null) {
      return; // Ignore BijTableComponent.updateViewport because not fully initialized yet.
    }

    this._runningUpdateViewport = true;
    this._changeDetector.detach();
    try {
      switch (viewportChangeAction) {
        case ViewportChangeAction.DATA_SOURCE:
        case ViewportChangeAction.FILTER:
        case ViewportChangeAction.LAYOUT:
        case ViewportChangeAction.HEADER:
        case ViewportChangeAction.SORT:
          this.scrollModel.setLastRangeElementCount(this.computeLastRangeRowCount());
          break;
      }

      // Populate the viewport.
      this.increaseRangeEndToFitViewport();
      this.decreaseRangeStartToFitViewport();
      this._startElementIdentity = this.computeElementIdentity(this.scrollModel.start);
    } finally {
      this._runningUpdateViewport = false;
      this._changeDetector.reattach();
    }

    // Fire viewport change event.
    this.viewportChange.emit({
      action: viewportChangeAction,
      position: this.scrollModel.positionRatio,
      range: this.scrollModel.rangeRatio
    } as ViewportChangeEvent);
  }

  /**
   * Computes the number of elements in the viewport when scrolled to the end.
   */
  private computeLastRangeRowCount(): number {
    const originalScrollModel = this.scrollModel;
    this._runningLastRangeComputation = true;
    try {
      // apply a temporary scroll model to capture the number of rows in the viewport
      this.applyScrollModel(new TableScrollModel());
      this.scrollModel.setSize(this.tableModel.filteredRowCount);
      // scroll to the end
      this.scrollModel.setPositionRatio(1);
      // fill up viewport with the last rows
      this.decreaseRangeStartToFitViewport();
      return this.scrollModel.end - this.scrollModel.start;
    } finally {
      // restore the original scroll model
      this.applyScrollModel(originalScrollModel);
      this._runningLastRangeComputation = false;
    }
  }

  /**
   * Computes the identity of the element associated with the specified row.
   *
   * This method returns null if 'trackByFn' is not configured,
   * or if there is no element associated with the row.
   */
  private computeElementIdentity(rowIndex: number): any {
    if (!this.trackBy) {
      return null;
    }

    const row = this.tableModel.filteredRows[rowIndex];
    return row && row.element && this.trackBy(rowIndex, row.element);
  }

  private applyScrollModel(scrollModel: TableScrollModel): void {
    this.scrollModel = scrollModel;
    this._changeDetector.detectChanges();
  }

  /**
   * Fills up free vertical space in viewport with subsequent rows (if applicable)
   */
  private increaseRangeEndToFitViewport(): void {
    do {
      this._changeDetector.detectChanges();
    } while (this.hasFreeVerticalSpace() && this.scrollModel.tryIncrementEnd());
  }

  /**
   * Fills up free vertical space in viewport with previous rows (if applicable)
   */
  private decreaseRangeStartToFitViewport(): void {
    if (!this.scrollModel.lastInRange || !this.hasFreeVerticalSpace()) {
      return;
    }

    while (this.hasFreeVerticalSpace() && this.scrollModel.tryDecrementStart()) {
      this._changeDetector.detectChanges();
    }
    if (this.isVerticalContentOverflow() && this.scrollModel.tryIncrementStart()) {
      this._changeDetector.detectChanges();
    }
  }

  /**
   * Returns true if the rendered rows do not fill up the viewport.
   */
  private hasFreeVerticalSpace(): boolean {
    return !(this._viewportElement.scrollHeight > this._viewportElement.clientHeight);
  }

  /**
   * Returns true if the content exceeds the viewport height.
   */
  private isVerticalContentOverflow(): boolean {
    return this._viewportElement.scrollHeight > this._viewportElement.clientHeight;
  }
}
