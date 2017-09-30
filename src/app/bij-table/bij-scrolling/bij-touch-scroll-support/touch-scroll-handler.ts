import { ScrollDirection } from 'app/bij-table/bij-scrolling/scroll-direction.enum';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { BijUtils } from '../../bij.utils';
import { SwipeScrollPointGenerator } from './swipe-scroll-point-generator';
import { TouchScrollEventSource } from './touch-scroll-event-source.enum';
import { TouchScrollConfig } from './touch-scroll.config';
import { TouchScrollEvent } from './touch-scroll.event';

export class TouchScrollHandler {

  private static readonly SWIPE_EMULATION_INTERVAL_MS = 50;

  private _config: TouchScrollConfig;
  private _lastTouchPosition: number; // the coordinate of the previous touch event used to calculate the delta between two events
  private _lastAppliedDragPosition: number; // the coordinate where the touch gesture started or where it last triggered scrolling
  private _touchPoints: TouchDragData[] = [];

  private _cancelSwipeScrollPointGenerator$ = new Subject<void>();
  private _destroy$ = new Subject<void>();
  private _configChange$ = new Subject<void>();

  private _touchScroll$ = new Subject<TouchScrollEvent>();

  constructor(private _direction: ScrollDirection, private _hostElement: HTMLElement) {
  }

  public set config(config: TouchScrollConfig) {
    this._configChange$.next();
    this._config = config;

    if (config.cancelSwipe$) {
      config.cancelSwipe$
        .takeUntil(this._destroy$)
        .takeUntil(this._configChange$)
        .subscribe(() => {
          this._cancelSwipeScrollPointGenerator$.next();
        });
    }
  }

  public destroy(): void {
    this._destroy$.next();
  }

  public get touchScroll$(): Observable<TouchScrollEvent> {
    return this._touchScroll$.asObservable();
  }

  public handleTouchStart(event: TouchEvent): void {
    this._cancelSwipeScrollPointGenerator$.next();

    if (event.touches.length > 1) {
      return;
    }

    this._touchPoints = [];
    this._lastTouchPosition = this.getPosition(event);
    this._lastAppliedDragPosition = this._lastTouchPosition;
  }

  public handleTouchMove(event: TouchEvent): void {
    if (event.touches.length > 1) {
      return;
    }

    event.preventDefault();
    const currentPosition = this.getPosition(event);
    const delta = this._lastTouchPosition - currentPosition;

    if (Math.abs(delta) < 5 && this._config.stepSize) {
      return; // early return: skip this event as delta is to small
    }

    this._touchPoints.push({
      timestamp: event.timeStamp,
      delta: delta,
      position: currentPosition
    });

    this._lastTouchPosition = currentPosition;

    const touchScrollEvent = this.handleDrag(currentPosition);
    if (touchScrollEvent) {
      this._touchScroll$.next(touchScrollEvent);
    }
  }

  public handleTouchEnd(timestamp: number): void {
    this.ifSwipeGestureThen(timestamp, initialSwipeRatio => SwipeScrollPointGenerator.create$(initialSwipeRatio, this._config.stepSize, TouchScrollHandler.SWIPE_EMULATION_INTERVAL_MS)
      .takeUntil(this._destroy$)
      .takeUntil(this._cancelSwipeScrollPointGenerator$)
      .subscribe(deltaRatio => this._touchScroll$.next({
          deltaRatio: deltaRatio,
          source: TouchScrollEventSource.Swipe
        })
      ));
  }

  private handleDrag(position: number): TouchScrollEvent {
    const stepSizeRatio = this._config.stepSize;
    const stepSizePixel = stepSizeRatio * this._hostSize;
    const deltaPixel = this._lastAppliedDragPosition - position;

    if (Math.abs(deltaPixel) < stepSizePixel) {
      return null;
    }

    let deltaRatio = deltaPixel / this._hostSize;
    if (stepSizeRatio) { // trim deltaRatio to entire steps
      const steps = (deltaRatio > 0) ? Math.floor(deltaRatio / stepSizeRatio) : Math.ceil(deltaRatio / stepSizeRatio);
      deltaRatio = steps * stepSizeRatio;
    }

    this._lastAppliedDragPosition -= (deltaRatio * this._hostSize);

    return {
      deltaRatio: deltaRatio,
      source: TouchScrollEventSource.Drag
    };
  }

  private ifSwipeGestureThen(touchEndTimestamp: number, thenFn: (initialSwipeRatio: number) => void): void {
    // extract touchpoints that occurred in the past 100ms
    const periodOfInterest = 100;

    const recentDeltaPixel = this._touchPoints
      .filter((touchPoint: TouchDragData) => touchEndTimestamp - touchPoint.timestamp <= periodOfInterest)
      .reduce((acc, curr) => acc + curr.delta, 0);

    if (Math.abs(recentDeltaPixel) <= 30) {
      return;
    }

    // handle swipe
    const recentDeltaRatio = recentDeltaPixel / this._hostSize;
    const ticks = periodOfInterest / TouchScrollHandler.SWIPE_EMULATION_INTERVAL_MS;
    thenFn((recentDeltaRatio / ticks) * this._config.swipeScrollSpeed);
  }

  private get _hostSize(): number {
    return (this._direction === ScrollDirection.Vertical) ? BijUtils.elHeight(this._hostElement) : BijUtils.elWidth(this._hostElement);
  }

  private getPosition(event: TouchEvent): number {
    return (this._direction === ScrollDirection.Vertical) ? event.touches[0].clientY : event.touches[0].clientX;
  }
}

interface TouchDragData {
  timestamp: number;
  delta: number;
  position: number;
}
