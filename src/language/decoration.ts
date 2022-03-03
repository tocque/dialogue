import { Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view"

class LabelWidget extends WidgetType {

    constructor(readonly content: string) {
        super();
    }

    eq(other: LabelWidget) {
        return other.content == this.content }

    toDOM() {
        const wrap = document.createElement("span");
        wrap.setAttribute("aria-hidden", "true");
        wrap.className = "cm-label-widget";
        wrap.innerText = this.content;
        return wrap;
    }

    ignoreEvent() {
        return false
    }
}

export function useLabel(content: string) {
    return Decoration.widget({
        widget: new LabelWidget(content),
        side: 1
    });
}
