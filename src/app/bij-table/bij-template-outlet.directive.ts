import { Directive, Input, TemplateRef, ViewContainerRef, ViewRef } from '@angular/core';

/**
 * Inserts an embedded view from a prepared {TemplateRef}.
 *
 * This directive works like the structural directive {NgTemplateOutlet}, but does not re-render the template on input context change.
 *
 * This results in a major performance boost when providing a context object to the template.
 */
@Directive({
  selector: '[bijTemplateOutlet]'
})
export class BijTemplateOutletDirective {

  private _viewRef: ViewRef;
  private _outlet: Outlet;

  @Input('bijTemplateOutlet') // tslint:disable-line:no-input-rename
  public set outlet(outlet: Outlet) {
    this.update(this._outlet, outlet);
    this._outlet = outlet;
  }

  constructor(private _viewContainerRef: ViewContainerRef) {
  }

  public update(oldOutlet: Outlet, newOutlet: Outlet): void {
    // Update only on template change, and not on context change.
    // This results in a major performance boost and is why {NgTemplateOutlet} is not used.
    if (oldOutlet && oldOutlet.identity === newOutlet.identity && oldOutlet.templateRef === newOutlet.templateRef) {
      return;
    }

    // Dispose current view
    if (this._viewRef) {
      this._viewContainerRef.remove(this._viewContainerRef.indexOf(this._viewRef));
      this._viewRef = null;
    }

    // Render new view
    if (newOutlet.templateRef) {
      this._viewRef = this._viewContainerRef.createEmbeddedView(newOutlet.templateRef, newOutlet.context || null);
    }
  }
}

export interface Outlet {
  templateRef: TemplateRef<any>,
  context: any;
  identity: any;
}
