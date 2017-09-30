import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { Subject } from 'rxjs/Subject';
import { TeardownLogic } from 'rxjs/Subscription';

/**
 * Provides an Observable which generates scroll-points after a swipe gesture. This is used to continue scrolling after
 * a detected swipe gesture.
 */
export class SwipeScrollPointGenerator {

  private constructor() {
  }

  /**
   * Creates an Observable which continuously emits a decreased 'deltaRatio' until converging to singleScrollStepRatio.
   * Then, the observable completes.
   */
  public static create$(initialSwipeDeltaRatio: number, singleScrollStepRatio: number, interval: number): Observable<number> {
    return Observable.create((observer: Observer<number>): TeardownLogic => {
      const threshold = Math.max(singleScrollStepRatio, .0001 /* if not scrolling discrete steps */);

      const ticker = Observable.interval(interval)
        .startWith() // start immediately without waiting for the first interval to elapse
        .scan(accDeltaRatio => accDeltaRatio * .8, initialSwipeDeltaRatio) // compute decreased ratio
        .do((deltaRatio) => observer.next(deltaRatio)) // emit current ratio of phase 1
        .first( // guard to start ease-out phase; if true this subscription chain unsubscribes from the source 'Observable.interval(...) (which then completes)
          (deltaRatio) => Math.abs(deltaRatio) <= threshold, // guard
          (deltaRatio) => Math.sign(deltaRatio) * (singleScrollStepRatio || 0), // value to continue the chain if 'guard=true'
          0) // default value
        .filter(Boolean)
        .flatMap((deltaRatio) => this.easeout$(interval, deltaRatio)) // start ease-out-phase
        .do((deltaRatio) => observer.next(deltaRatio))  // emit current ratio of phase 2
        .finally(() => observer.complete())
        .subscribe();

      return (): void => ticker.unsubscribe();
    });
  }

  /**
   * Creates an Observable which emits the given 'deltaRatio' at a increasing interval until the interval is > 400ms (ease-out).
   *
   * This is only used when scrolling discrete steps. (singleScrollStepRatio > 0)
   */
  public static easeout$(startDelay: number, deltaRatio: number): Observable<number> {
    const destroyTimer$ = new Subject<void>();
    return Observable.create((observer: Observer<number>): TeardownLogic => {
      schedule(startDelay);
      return (): void => destroyTimer$.next();

      // internal scheduler
      function schedule(delay: number): void {
        Observable.timer(delay)
          .takeUntil(destroyTimer$)
          .subscribe(() => {
            observer.next(deltaRatio);

            const nextDelay = delay * 1.2;
            if (nextDelay >= 400) {
              observer.complete();
            } else {
              schedule(nextDelay);
            }
          });
      }
    });
  }
}
