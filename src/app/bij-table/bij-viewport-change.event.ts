/**
 * Specifies the cause of a viewport change.
 */
export enum BijViewportChangeAction {
  REWIND, FORWARD, GOTO, LAYOUT, DATA_SOURCE, FILTER, SORT, HEADER
}
/**
 * Event which is fired upon a change of the visible client area in the viewport.
 */
export interface BijViewportChangeEvent {

  /**
   * Action which caused this event.
   */
  action: BijViewportChangeAction;
  /**
   * The new normalized position of the client area in the viewport, and is defined as closed interval [0, 1].
   *
   *  0.0: top
   *  0.5: centered
   *  1.0: bottom
   */
  position: number;
  /**
   * Proportion of the visible client area in the viewport, and is defined as half-open interval (0, 1].
   *
   * 1.0: the client area fits completely into the viewport and no scrollbar are shown
   * 0.5: half of the client area fits into the viewport
   * 0.0: not applicable TODO explain why
   */
  range: number;
}
