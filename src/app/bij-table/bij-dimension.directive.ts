import { Directive, DoCheck, ElementRef, EventEmitter, NgZone, OnDestroy, Output } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

@Directive({
  selector: '[bijDimension]'
})
export class BijDimensionDirective implements DoCheck, OnDestroy {

  private _host: HTMLElement;
  private _dimension: Dimension;
  private _destroy$ = new Subject<void>();

  @Output()
  public dimensionChange = new EventEmitter<Dimension>();

  constructor(host: ElementRef, private _ngZone: NgZone) {
    this._host = host.nativeElement as HTMLElement;
    this._dimension = {
      offsetWidth: 0,
      offsetHeight: 0,
      clientWidth: 0,
      clientHeight: 0
    };

    this._ngZone.runOutsideAngular(() => { // run outside Angular zone to not trigger app ticks on every event
      Observable.fromEvent(window, 'resize')
        .takeUntil(this._destroy$)
        .subscribe(() => this.checkDimension());
    });
  }

  public ngDoCheck(): void {
    this.checkDimension();
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
  }

  private checkDimension(): void {
    const newDimension = {
      offsetWidth: this._host.offsetWidth,
      offsetHeight: this._host.offsetHeight,
      clientWidth: this._host.clientWidth,
      clientHeight: this._host.clientHeight
    };

    if (this._dimension.offsetWidth === newDimension.offsetWidth &&
      this._dimension.offsetHeight === newDimension.offsetHeight &&
      this._dimension.clientWidth === newDimension.clientWidth &&
      this._dimension.clientHeight === newDimension.clientHeight) {
      return;
    }

    this._dimension = newDimension;
    this._ngZone.run(() => {
      this.dimensionChange.emit(this._dimension);
    });
  }
}

export interface Dimension {
  offsetWidth: number;
  offsetHeight: number;
  clientWidth: number;
  clientHeight: number;
}
