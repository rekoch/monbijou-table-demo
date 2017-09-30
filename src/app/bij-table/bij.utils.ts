import { EmbeddedViewRef } from '@angular/core';

/**
 * Utility methods used in BijTable module.
 */
export class BijUtils {

  private constructor() {
  }

  /**
   * Creates a regular expression of the given filter text, and transforms asterisk (*) wildcard characters to match
   * any text (.*).
   */
  public static toFilterRegExp(filterText: string): RegExp {
    if (!filterText) {
      return null;
    }

    // Escape the user filter input and add wildcard support
    const escapedString = filterText.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    const wildcardString = escapedString.replace(/\\\*/g, '.*');
    return new RegExp(wildcardString, 'i');
  }

  /**
   * Returns the height of the given element.
   */
  public static elHeight(element: HTMLElement): number {
    return element && element.getBoundingClientRect().height || 0;
  }

  /**
   * Returns the width of the given element.
   */
  public static elWidth(element: HTMLElement): number {
    return element && element.getBoundingClientRect().width || 0;
  }

  /**
   * Throws an {Error} if the specified value is falsy.
   */
  public static assertTruthy<T>(value: T, msg: string): T {
    if (!value) {
      throw new Error(msg);
    }
    return value;
  }

  /**
   * Returns the rendered text content of the given {EmbeddedViewRef} and its descendants.
   */
  public static text(view: EmbeddedViewRef<any>): string {
    return view.rootNodes
      .map((rootNode: HTMLElement) => rootNode.innerText || rootNode.textContent)
      .join('')
      .trim();
  }
}
