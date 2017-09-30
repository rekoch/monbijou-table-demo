import { Observable } from 'rxjs/Observable';

/**
 * Allows to configure {BijHorizontalTouchScrollSupportDirective} and {BijVerticalTouchScrollSupportDirective}.
 */
export interface TouchScrollConfig {
  /**
   * stepSize === 0:   continuous scrolling
   * 0 < stepSize < 1: discrete steps
   */
  stepSize: number;

  /**
   * Use this factor to adjust scroll speed triggered by a swipe gesture.
   * For example when used in combination with virtual scrolling, setting swipeScrollSpeed to a value that represents the
   * ratio total-scroll-range/viewport adjusts the scroll speed after a swipe-gesture to the total-scroll-range.
   */
  swipeScrollSpeed: number;

  /**
   * Cancels emitting of extrapolated TouchScrollEvents after a swipe gesture.
   */
  cancelSwipe$?: Observable<void>;
}
