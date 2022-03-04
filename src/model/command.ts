/**
 * @module model/command
 */

import { cursorLineDown, cursorLineUp, standardKeymap } from "@codemirror/commands";
import { EditorSelection, EditorState, SelectionRange } from "@codemirror/state";
import { Command, EditorView, keymap } from "@codemirror/view";
import { first, last } from "lodash-es";
import { Model } from ".";
import { Line, RootLine } from "./line";

type Action = (range: SelectionRange) => SelectionRange;

function updateSel(sel: EditorSelection, by: Action) {
    return EditorSelection.create(sel.ranges.map(by), sel.mainIndex);
}

function setSel(state: EditorState, selection: EditorSelection) {
    return state.update({ selection, scrollIntoView: true, userEvent: "select" });
}

function moveSel({ state, dispatch }: EditorView, how: Action) {
    const selection = updateSel(state.selection, how);
    if (selection.eq(state.selection))
        return false;
    dispatch(setSel(state, selection));
    return true;
}

function rangeEnd(range: SelectionRange, forward: boolean) {
    return EditorSelection.cursor(forward ? range.to : range.from);
}

/**
 * 仅当可以移动时
 * @param view 
 * @param forward 
 * @returns 
 */
function myCursorByLine(view: EditorView, forward: boolean) {
    return moveSel(view, range => {
        if (!range.empty)
            return rangeEnd(range, forward);
        let moved = view.moveVertically(range, forward);
        return moved.head != range.head ? moved : range;
    });
}

function tryFoucs(line: Line | null) {
    if (!line) return false;
    line.focus();
    return true;
}

/**
 * @opt 需要性能优化时，将指令本身提出
 * @param line 
 * @returns 
 */
export function myKeymap(line: Line) {

    type ModeledCommand = (view: EditorView, model: Model) => boolean;

    const modelWrapper = (modeledCommand: ModeledCommand): Command => {
        return (view) => {
            if (!line.model) return false;
            return modeledCommand(view, line.model);
        }
    }

    /**
     * 获取上一行
     * 具体来说，依次尝试获得
     *  - 以上一个同级的行为根的子树的最后一个节点
     *  - 父亲
     */
    const getPreviousLine = () => {
        const previousSibling = line.previousSibling();
        if (!previousSibling) {
            if (line.parent && !(line.parent instanceof RootLine)) return line.parent;
            return null;
        }
        let result = previousSibling;
        while (result.children.length > 0) {
            result = last(result.children)!;
        }
        return result;
    }

    /**
     * 获取下一行
     * 具体来说，依次尝试获得
     *  - 第一个子行
     *  - 下一个同级的行
     *  - 祖先拥有的最近的下一个同级行
     */
    const getNextLine = () => {
        if (line.children.length > 0) return first(line.children)!;
        const nextSibling = line.nextSibling();
        if (nextSibling) return nextSibling;
        let ancestor = line;
        while (ancestor.parent && !(ancestor instanceof RootLine)) {
            const nextSibling = ancestor.nextSibling();
            if (nextSibling) return nextSibling;
            ancestor = ancestor.parent;
        }
        return null;
    }

    /**
     * 光标上移一行的逻辑
     * 1. 尝试上移到上一文本行 成功则结束
     * 2. 尝试聚焦上一行
     * 3. 移动到行首
     * 
     * 下移同理
     * 
     * @todo 优化行间移动的光标具体位置
     */
    const myCursorLineUp: Command = (view) => {
        return myCursorByLine(view, false)
            || tryFoucs(getPreviousLine())
            || cursorLineUp(view);
    }

    const myCursorLineDown: Command = (view) => {
        return myCursorByLine(view, true)
            || tryFoucs(getNextLine())
            || cursorLineDown(view);
    }

    const newLine = modelWrapper((view, model) => {
        model.appendNewLine(line.id);
        return true;
    });

    const backspace = modelWrapper((view, model) => {
        if (!line.isEmpty()) return false;
        if (!line.isDeletable()) return false;
        model.deleteLine(line.id);
        return true;
    });

    return keymap.of([
        { key: "ArrowUp", run: myCursorLineUp },
        { key: "ArrowDown", run: myCursorLineDown },
        { key: "Shift-Enter", run: newLine },
        { key: "Backspace", run: backspace },
        ...standardKeymap,
    ]);
}
