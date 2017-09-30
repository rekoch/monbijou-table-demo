import { Directive, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { ScrollDirection } from '../scroll-direction.enum';
import { TouchScrollHandler } from './touch-scroll-handler';
import { TouchScrollConfig } from './touch-scroll.config';
import { TouchScrollEvent } from './touch-scroll.event';

/**
 * Adds horizontal touch scroll capability to the host element.
 */
@Directive({
  selector: '[bijHorizontalTouchScrollSupport]'
})
export class BijHorizontalTouchScrollSupportDirective implements OnDestroy {

  private _destroy$ = new Subject<void>();
  private _touchScrollHandler: TouchScrollHandler;

  @Input('bijHorizontalTouchScrollSupport') // tslint:disable-line:no-input-rename
  public set config(config: TouchScrollConfig) {
    this._touchScrollHandler.config = config;
  }

  @Output()
  public horizontalTouchScroll = new EventEmitter<TouchScrollEvent>();

  constructor(host: ElementRef) {
    this._touchScrollHandler = new TouchScrollHandler(ScrollDirection.Horizontal, host.nativeElement as HTMLElement);

    this._touchScrollHandler.touchScroll$
      .takeUntil(this._destroy$)
      .subscribe((event: TouchScrollEvent) => this.horizontalTouchScroll.emit(event));
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._touchScrollHandler.destroy();
  }

  @HostListener('touchstart', ['$event'])
  public onTouchStart(event: TouchEvent): void {
    this._touchScrollHandler.handleTouchStart(event);
  }

  @HostListener('touchmove', ['$event'])
  public onTouchMove(event: TouchEvent): void {
    this._touchScrollHandler.handleTouchMove(event);
  }

  @HostListener('touchcancel', ['$event'])
  @HostListener('touchend', ['$event'])
  public onTouchEnd(event: TouchEvent): void {
    this._touchScrollHandler.handleTouchEnd(event.timeStamp);
  }
}
