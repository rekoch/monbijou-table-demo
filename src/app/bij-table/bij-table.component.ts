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
import { BijViewportChangeAction, BijViewportChangeEvent } from './bij-viewport-change.event';
import { TableScrollModel } from './model/table-scroll.model';
import { TableModel } from './model/table.model';

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

  private _viewportDimension: Dimension = {width: 0, height: 0};
  private _viewportClientDimension: Dimension = {width: 0, height: 0};
  private _tableHeadDimension: Dimension = {width: 0, height: 0};

  /**
   * During a touch-gesture this array contains a snapshot of all rows which are in the viewport when the gesture started.
   * Since the gesture's touch events are emitted by an element contained in these rows they need to be kept in the DOM
   * until the gesture is completed. Any modification (i.e. moving/removing these rows) would prevent further touch events
   * and corrupt the gesture.
   *
   * During the gesture this.rows() prepends this snapshot to the rows according to the state of the table model and
   * the scroll model. These preserved rows are hidden in the DOM and only completely removed once the gesture completes.
   */
  private _preservedHiddenRows: BijRowDirective[] = [];

  @ViewChild('bij_viewport')
  private set viewport(viewport: ElementRef) {
    this._viewportElement = viewport.nativeElement as HTMLElement;
  }

  @ContentChild(BijHeaderDirective)
  private set header(header: BijHeaderDirective) {
    this.tableModel.setHeader(header);
    this.scrollModel.setSize(this.tableModel.filteredRowCount);
    this.scrollModel.setPositionRatio(0);
    this.updateViewport(BijViewportChangeAction.HEADER);
  }

  @ContentChildren(BijRowDirective)
  private _rows: QueryList<BijRowDirective>;

  @Input()
  public set filter(filter: string) {
    this.tableModel.setTableFilter(filter);
    this.scrollModel.setSize(this.tableModel.filteredRowCount);
    this.scrollModel.setPositionRatio(0);
    this.updateViewport(BijViewportChangeAction.FILTER);
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
  public viewportChange = new EventEmitter<BijViewportChangeEvent>();

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
        this.updateViewport(BijViewportChangeAction.FILTER);
      });

    // Listen to column sort changes to invalidate the table model
    this.tableModel.sortChange$
      .takeUntil(this._destroy$)
      .subscribe(() => {
        this.tableModel.invalidate();
        this.updateViewport(BijViewportChangeAction.SORT);
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
          this.updateViewport(BijViewportChangeAction.DATA_SOURCE);
        }
      });
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
  }

  public get titleCells(): BijTitleCellDirective[] {
    return this.tableModel.header ? [...this.tableModel.header.titleCells.toArray()] : [];
  }

  public get rows(): BijRowDirective[] {
    // TODO Verify how often this method gets called before every Angular version update
    // console.log('rows');
    if (this._preservedHiddenRows.length > 0) {
      return [...this._preservedHiddenRows, ...this.rowsInScrollRange];
    }
    return this.rowsInScrollRange;
  }

  public isPreservedHiddenRow(rowIndex: number): boolean {
    return rowIndex < this._preservedHiddenRows.length;
  }

  public get preservedHiddenRowCount(): number {
    return this._preservedHiddenRows.length;
  }

  /**
   * Indicates whether {BijTableComponent} is currently initializing the {TableScrollModel},
   * which temporary renders the last rows into the viewport.
   */
  public get initializingTableScrollModel(): boolean {
    return this._runningLastRangeComputation;
  }

  // TODO indicate success via boolean return value
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
      this.updateViewport(BijViewportChangeAction.GOTO);
    }
  }

  public scrollToPosition(position: number): void {
    this.scrollModel.setPositionRatio(position);
    this.updateViewport(BijViewportChangeAction.GOTO);
  }

  public onVerticalScroll(distance: number, stopSwipeScrolling: boolean = true): void {
    this.scrollModel.movePosition(distance);
    this.updateViewport(distance < 0 ? BijViewportChangeAction.REWIND : BijViewportChangeAction.FORWARD);
    if (stopSwipeScrolling) {
      this._stopVerticalSwipeScrolling$.next();
    }
  }

  public onTouchStart(): void {
    this._preservedHiddenRows = [...this.rowsInScrollRange];
    this.updateViewport(BijViewportChangeAction.LAYOUT);
  }

  public onVerticalTouchScroll(event: TouchScrollEvent): void {
    const clipRatio = this.rowsInScrollRange.length / this.scrollModel.scrollSize;
    const deltaYRatio = event.deltaRatio * (clipRatio);
    const stopSwipeScrolling = event.source === TouchScrollEventSource.Swipe && (this.scrollModel.positionRatio in [0, 1]);
    this.onVerticalScroll(deltaYRatio, stopSwipeScrolling);
  }

  public onTouchEnd(): void {
    this._preservedHiddenRows = [];
    this.updateViewport(BijViewportChangeAction.LAYOUT);
  }

  public onHorizontalTouchScroll(event: TouchScrollEvent): void {
    const deltaPx = event.deltaRatio * this._viewportClientDimension.width;

    if (this.isHorizontalContentOverflow()) {
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

  public get horizontalScrollbarVisible(): boolean {
    return this._viewportClientDimension.width > this._viewportDimension.width;
  }

  public get horizontalScrollThumbSizeRatio(): number {
    return this._viewportDimension.width / this._viewportClientDimension.width;
  }

  public get horizontalScrollThumbPositionRatio(): number {
    return -this._viewportClientTranslateX / this.horizontalScrollWidth;
  }

  public get scrollbarTopPx(): number {
    return this._tableHeadDimension.height;
  }

  private get horizontalScrollWidth(): number {
    return this._viewportClientDimension.width - this._viewportDimension.width;
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
    this.updateViewport(BijViewportChangeAction.REWIND);
  }

  public onPageEnd(event: KeyboardEvent): void {
    this.scrollModel.setPositionRatio(1);
    this.updateViewport(BijViewportChangeAction.FORWARD);
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
   *
   * FIXME Because this component does manual change detection (detached), cell model changes are not reflected yet.
   *       This has to be fixed, but still, this method should not be removed from API.
   */
  public layout(): void {
    this.tableModel.invalidate(); // in case a filter does not apply anymore
    this.scrollModel.setSize(this.tableModel.filteredRowCount);
    this.scrollModel.clearRange(); // to (re)compute the scrollbar thumb size, e.g. when shrinking the viewport height.
    this.updateViewport(BijViewportChangeAction.LAYOUT);
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
  public newTrData(row: BijRowDirective, rowIndex: number, displayedRowIndex: number, childTemplateRef: TemplateRef<any>): TrData {
    return {row, rowIndex, displayedRowIndex, childTemplateRef};
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
  private updateViewport(viewportChangeAction: BijViewportChangeAction): void {
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
        case BijViewportChangeAction.DATA_SOURCE:
        case BijViewportChangeAction.FILTER:
        case BijViewportChangeAction.LAYOUT:
        case BijViewportChangeAction.HEADER:
        case BijViewportChangeAction.SORT:
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
    } as BijViewportChangeEvent);
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
   * Returns true if the content exceeds the viewport width.
   */
  private isHorizontalContentOverflow(): boolean {
    return this._viewportElement.scrollWidth > this._viewportElement.clientWidth;
  }

  /**
   * Returns true if the content exceeds the viewport height.
   */
  private isVerticalContentOverflow(): boolean {
    return this._viewportElement.scrollHeight > this._viewportElement.clientHeight;
  }
}
