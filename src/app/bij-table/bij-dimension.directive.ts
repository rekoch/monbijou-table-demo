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
    this._dimension = {width: 0, height: 0};

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
      width: this._host.clientWidth,
      height: this._host.clientHeight
    };

    if (this._dimension.width === newDimension.width && this._dimension.height === newDimension.height) {
      return;
    }

    this._dimension = newDimension;
    this._ngZone.run(() => {
      this.dimensionChange.emit(this._dimension);
    });
  }
}

export interface Dimension {
  width: number;
  height: number;
}
