/**
 * Represents the viewport scroll model to keep track of the current rendered elements.
 */
export class TableScrollModel {

  private _start: number;
  private _end: number;
  private _size: number;

  private _lastRangeElementCount: number;

  constructor() {
    this._start = 0;
    this._end = 0;
    this._lastRangeElementCount = 0;
    this.setSize(0);
  }

  /**
   * Proportion ratio between 0 and 1 to position the thumb.
   *  0.0: top
   *  0.5: centered
   *  1.0: bottom
   */
  public get positionRatio(): number {
    const scrollSize = this.scrollSize;
    return scrollSize ? (this._start / scrollSize) : 0;
  }

  /**
   * Proportion ratio between 0 and 1 to scale the thumb.
   *  0.0: invisible
   *  0.5: half of the scrollbar size
   *  1.0: full scrollbar size
   */
  public get rangeRatio(): number {
    return this._size ? ((this._end - this._start ) / this._size) : 1;
  }

  /**
   * Extends the range by advancing the 'range-end' by 1. The 'range-start' is not changed.
   *
   * @return false if not applicable because out of bounds otherwise
   */
  public tryIncrementEnd(): boolean {
    if (this._size === 0 || this._end === this._size) {
      return false;
    }

    this._end++;
    return true;
  }

  /**
   * Extends the range by decreasing the 'range-start' by 1. The 'range-end' is not changed.
   *
   * @return false if not applicable because out of bounds otherwise
   */
  public tryDecrementStart(): boolean {
    if (this._size === 0 || this._start === 0) {
      return false;
    }

    this._start--;
    return true;
  }

  /**
   * Shrinks the range by advancing the 'range-start' by 1. The 'range-end' is not changed.
   *
   * @return false if not applicable because out of bounds otherwise
   */
  public tryIncrementStart(): boolean {
    if (this._size === 0 || this._start === this.scrollSize || this._start === this._end) {
      return false;
    }

    this._start++;
    return true;
  }

  /**
   * Clears the range by setting the 'range-end' to the 'range-start' value. The 'range-start' is not changed.
   */
  public clearRange(): void {
    this._end = this.ensureValidEnd(this._start);
  }

  /**
   * Moves the position by adding the specified distance proportion ratio [0;1] and clears the range.
   */
  public movePosition(distance: number): void {
    if (this.rangeRatio === 1 || distance === 0) {
      return;
    }

    const positionRatio = Math.min(1, Math.max(0, this.positionRatio + distance));
    const newPosition = positionRatio * this.scrollSize;
    let newStart = Math.round(newPosition);

    // Ensure to move the position even if 'abs(distance)' is too small to represent a single record.
    if (newStart === this._start) {
      newStart += Math.sign(distance);
    }

    this._start = this.ensureValidStart(newStart);
    this._end = this.ensureValidEnd(this._start);
  }

  /**
   * Positions the thumb with the specified proportion ratio between 0 and 1.
   *  0.0: top
   *  0.5: centered
   *  1.0: bottom
   */
  public setPositionRatio(positionRatio: number): void {
    if (positionRatio < 0 || positionRatio > 1) {
      throw new Error(`Invalid position ratio. Must be between 0 and 1 [${positionRatio}]`);
    }

    this._start = this.ensureValidStart(this.scrollSize * positionRatio);
    this._end = this.ensureValidEnd(this._start);
  }

  /**
   * Sets a new total size.
   * If still valid, 'range-start' and 'range-end' are not invalidated.
   */
  public setSize(size: number): void {
    this._size = size;
    this._start = this.ensureValidStart(this._start);
    this._end = this.ensureValidEnd(this._end);
  }

  /**
   * Sets the number of elements in the viewport when scrolled to the end.
   */
  public setLastRangeElementCount(count: number): void {
    this._lastRangeElementCount = count;
  }

  /**
   * Returns true if the last element is within the viewport range.
   */
  public get lastInRange(): boolean {
    return this._end === this._size;
  }

  public setStart(start: number): void {
    this._start = this.ensureValidStart(start);
    this._end = this.ensureValidEnd(this._start);
  }

  /**
   * Returns a sub-array matching the current range.
   */
  public applyRange<T>(elements: T[]): T[] {
    return elements.slice(this._start, this._end);
  }

  /**
   * Returns the index of the first element to be rendered in the viewport.
   */
  public get start(): number {
    return this._start;
  }

  /**
   * Returns the index of the last element to be rendered in the viewport (exclusive).
   */
  public get end(): number {
    return this._end;
  }

  /**
   * Returns the total element count.
   */
  public get size(): number {
    return this._size;
  }

  /**
   * Returns the total element count minus the number of elements in the viewport when scrolled to the end.
   */
  public get scrollSize(): number {
    return this._size - this._lastRangeElementCount;
  }

  private ensureValidStart(start: number): number {
    return Math.max(Math.min(start, this.scrollSize), 0);
  }

  private ensureValidEnd(end: number): number {
    return Math.min(end, this._size);
  }
}
