import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostBinding, Inject, Input, NgZone, OnDestroy, Output } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { Dimension } from '../../bij-dimension.directive';
import { ScrollDirection } from '../scroll-direction.enum';

@Component({
  selector: 'bij-scrollbar',
  templateUrl: './bij-scrollbar.component.html',
  styleUrls: ['./bij-scrollbar.component.scss']
})
export class BijScrollbarComponent implements OnDestroy {

  private _destroy$ = new Subject<void>();

  private _host: HTMLElement;
  private _hostDimension: Dimension = {
    offsetWidth: 0,
    offsetHeight: 0,
    clientWidth: 0,
    clientHeight: 0
  };
  private _dragPosition: number;

  @Input()
  public direction = ScrollDirection.Vertical;

  /**
   * Ratio between 0 and 1 to position the thumb.
   *  0.0: top
   *  0.5: centered
   *  1.0: bottom
   */
  @Input()
  public thumbPosition: number;

  /**
   * Ratio between 0 and 1 to scale the thumb.
   *  0.0: invisible
   *  0.5: half of the scrollbar size
   *  1.0: full scrollbar size
   */
  @Input()
  public thumbSize: number;

  /**
   * Distance threshold for emitting scroll events.
   */
  @Input()
  public minScrollRatio = 0;

  /**
   * Emits the scrolled distance when dragging the thumb.
   * The emitted value is the ratio of the dragging distance to the scroll-range.
   * (scroll-range = scrollbar size - thumb size)
   *
   * However, the thumb is not moved within its track.
   */
  @Output()
  public scroll: EventEmitter<number> = new EventEmitter<number>();

  @HostBinding('class.vertical')
  public get vertical(): boolean {
    return this.direction === ScrollDirection.Vertical;
  }

  @HostBinding('class.horizontal')
  public get horizontal(): boolean {
    return this.direction === ScrollDirection.Horizontal;
  }

  constructor(host: ElementRef, @Inject(DOCUMENT) document: any, private _ngZone: NgZone) {
    this._host = host.nativeElement as HTMLElement;

    _ngZone.runOutsideAngular(() => { // run outside Angular zone to not trigger app ticks on every event
      Observable.fromEvent(document, 'mousemove')
        .takeUntil(this._destroy$)
        .subscribe((event: MouseEvent) => this.onDocumentMouseMove(event));

      Observable.fromEvent(document, 'mouseup')
        .takeUntil(this._destroy$)
        .subscribe((event: MouseEvent) => this.onDocumentMouseUp(event));
    });
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
  }

  public onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    this._dragPosition = this.vertical ? event.touches[0].pageY : event.touches[0].pageX;
  }

  public onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    this.onDragTo(this.vertical ? event.touches[0].pageY : event.touches[0].pageX);
  }

  public onTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    this._dragPosition = null;
  }

  public onHostDimensionChange(dimension: Dimension): void {
    this._hostDimension = dimension;
  }

  public get thumbTopPx(): number {
    return this.vertical && this.thumbPosition * this.scrollRangePx;
  }

  public get thumbLeftPx(): number {
    return this.horizontal && this.thumbPosition * this.scrollRangePx;
  }

  public get thumbHeightPercentage(): number {
    return this.vertical && this.thumbSize * 100;
  }

  public  get thumbWidthPercentage(): number {
    return this.horizontal && this.thumbSize * 100;
  }

  public onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      event.stopPropagation();
      event.preventDefault();
      this._dragPosition = this.vertical ?  event.pageY : event.pageX;
    }
  }

  private onDocumentMouseMove(event: MouseEvent): void {
    if (this.scrolling) {
      this._ngZone.run(() => this.onDragTo(this.vertical ?  event.pageY : event.pageX));
    }
  }

  private  onDocumentMouseUp(event: MouseEvent): void {
    if (this.scrolling && event.button === 0) {
      this._dragPosition = null;
    }
  }

  private onDragTo(pagePosition: number): void {
    const deltaPx = pagePosition - this._dragPosition;
    const deltaRatio = deltaPx / this.scrollRangePx;

    if (Math.abs(deltaRatio) < this.minScrollRatio) {
      return;
    }
    this._dragPosition = pagePosition;
    this.scroll.emit(deltaRatio);
  }

  private get scrolling(): boolean {
    return !!this._dragPosition;
  }

  private get scrollRangePx(): number {
    const trackDimension = this._hostDimension;
    const trackSizePx = this.vertical ? trackDimension.clientHeight : trackDimension.clientWidth;
    const thumbSizePx = Math.max(trackSizePx * this.thumbSize, 20);
    return trackSizePx - thumbSizePx;
  }
}
