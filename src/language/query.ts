import { ensureSyntaxTree, syntaxTree, syntaxTreeAvailable } from "@codemirror/language";
import { EditorState } from "@codemirror/state";

/**
 * 查询指令名，必须自行保证传入的view是指令
 * @todo 可以cache input
 * @param view 
 */
export function queryOrderName(state: EditorState) {
    const tree = ensureSyntaxTree(state, state.doc.length);
    if (!tree) return null;
    const root = tree.topNode;
    if (root.name !== "Line") throw new Error("");

    const line = root.firstChild;
    if (!line || line.name === "⚠") return null;

    // OrderHeader = OrderMethod DefaultParam NamedParam*
    const header = line.firstChild;
    if (!header || header.name !== "OrderHeader") throw new Error("");

    // OrderMethod = OrderSymbol OrderName
    const method = header.firstChild;
    if (!method || method.name !== "OrderMethod") throw new Error("");

    const name = method.lastChild;
    if (!name || name.name !== "OrderName") return null;

    return state.sliceDoc(name.from, name.to);
}
