import { PointerEvent, Text, type IPointData, type IUI } from "leafer";
import type { IDrawResult, TCallback } from "../types";
import { DrawBase } from "./draw-base";

export class DrawText extends DrawBase {
  protected element: IUI | null = null;

  protected createElement(startPoint: IPointData): IUI {
    return new Text({
      x: startPoint.x,
      y: startPoint.y,
      text: "双击编辑文本",
      editable: true,
      fill: "#000000",
      fontSize: 16,
    });
  }

  protected updateElement(_element: IUI, _endPoint: IPointData) {}

  protected getResult(): IDrawResult {
    return {
      action: "text",
      element: this.element,
    };
  }

  execute(callback: TCallback) {
    this.callback = callback;
    this.bindTextEvents();
  }

  cancel(callback: TCallback) {
    callback({});
    this.unBindTextEvents();
    this.element = null;
    this.callback = undefined;
  }

  private bindTextEvents() {
    const { app } = this.editor || {};
    if (!app) return;
    app.on(PointerEvent.DOWN, this.onDown);
  }

  private unBindTextEvents() {
    const { app } = this.editor || {};
    if (!app) return;
    app.off(PointerEvent.DOWN, this.onDown);
  }

  protected onDown = (evt: PointerEvent) => {
    const startPoint = evt.getPagePoint();
    this.element = this.createElement(startPoint);

    const { app } = this.editor || {};
    if (app && this.element) {
      app.tree.add(this.element);
      app.editor.target = this.element as Text;
      app.editor.focus();
      this.element.once("blur", () => {
        this.element = null;
      });
    }

    this.unBindTextEvents();
    this.callback?.(this.getResult());
  };
}
