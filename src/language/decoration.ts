import { Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view"

class LabelWidget extends WidgetType {

    constructor(readonly content: string) {
        super();
    }

    eq(other: LabelWidget) {
        return other.content == this.content }

    toDOM() {
        let wrap = document.createElement("span");
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

// import {EditorView, Decoration} from "@codemirror/view"
// import {syntaxTree} from "@codemirror/language"

// let deco = 
//   widgets.push(deco.range(to))
// function checkboxes(view: EditorView) {
//   let widgets = []
//   for (let {from, to} of view.visibleRanges) {
//     syntaxTree(view.state).iterate({
//       from, to,
//       enter: (type, from, to) => {
//         if (type.name == "BooleanLiteral") {
//           let isTrue = view.state.doc.sliceString(from, to) == "true"
//         }
//       }
//     })
//   }
//   return Decoration.set(widgets)
// }
