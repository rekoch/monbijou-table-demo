import { Directive, ElementRef, EventEmitter, OnDestroy, Output } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { WheelScrollEvent } from './wheel-scroll.event';

/**
 * Adds vertical mouse wheel capability to the host element.
 *
 * This directive computes the wheel-speed based on the wheel events occurred in the last 50ms.
 * The property 'WheelEvent.wheelDeltaY' cannot be used because not supported by all major browsers.
 *
 * TODO Use WheelEvent.deltaY instead
 */
@Directive({
  selector: '[bijVerticalWheelScrollSupport]'
})
export class BijVerticalWheelScrollSupportDirective implements OnDestroy {

  private _destroy$ = new Subject<void>();

  @Output()
  public verticalWheelScroll = new EventEmitter<WheelScrollEvent>();

  constructor(host: ElementRef) {
    Observable.fromEvent(host.nativeElement, 'wheel')
      .takeUntil(this._destroy$)
      .do((event: WheelEvent) => event.preventDefault())
      .scan((acc: WheelEvent[], evt: WheelEvent) => {
        acc.push(evt);
        return acc;
      }, [])
      .throttleTime(50)
      .map((liveEventBuffer: WheelEvent[]) => {
        const lastElementIndex = liveEventBuffer.length - 1;

        const evt: WheelScrollEvent = {
          speed: Math.pow(3, lastElementIndex), // 3^0=1, 3^1=3, 3^2=9, ...
          signum: Math.sign(liveEventBuffer[lastElementIndex].deltaY)
        };
        liveEventBuffer.length = 0;
        return evt;
      })
      .subscribe(this.verticalWheelScroll);
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
  }
}
