import { closeBrackets } from "@codemirror/closebrackets";
import { Compartment, EditorState, Transaction } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, keymap, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { computed, nextTick, Ref, ref, shallowReactive } from "vue";
import { lightplus } from "@/theme";
import { Model } from ".";
import { javascript } from "@codemirror/lang-javascript";
import { Dialog } from "@/grammar";
import { LineChildPolicy, LineContentType } from "@/language/types";
import { getContentType } from "@/language/utils";
import { checkType } from "@/language/checker";

const idMap = new Map<number, Line>();
let id = 0;

export function tryGetLineById(id: number) {
    return idMap.get(id);
}

export function getLineById(id: number) {
    const line = tryGetLineById(id);
    if (!line) throw Error(`line ${ id } doesn't exist`);
    return line;
}

export interface LineData {
    content: string;
    children?: LineData[];
}

export class Line {

    readonly id: number;

    model?: Model;
    parent?: Line;
    readonly children: Line[];

    protected readonly view: EditorView;
    
    protected constructor(data: LineData, parent?: Line) {

        this.id = id++;
        idMap.set(this.id, this);

        const { content, children = [] } = data;

        this.decorations = Decoration.set([]);

        /** @todo 拆分定义 */
        this.view = new EditorView({
            state: EditorState.create({
                doc: content,
                extensions: [
                    lightplus,
                    closeBrackets(),
                    this.languageConf.of([]),
                    keymap.of([
                        {
                            key: "Shift-Enter",
                            preventDefault: true,
                            run: () => {
                                if (!this.model) return false;
                                this.model.appendNewLine(this.id);
                                return true;
                            }
                        },
                        {
                            key: "Backspace",
                            run: () => {
                                if (!this.model) return false;
                                if (!this.isEmpty()) return false;
                                if (!this.isDeletable()) return false;
                                this.model.deleteLine(this.id);
                                return true;
                            }
                        }
                    ]),
                    ViewPlugin.define(() => ({
                        update: (update: ViewUpdate) => {
                            if (!update.docChanged) return;
                            this.checkType();
                        }
                    }), {
                        decorations: () => {
                            return this.decorations;
                        }
                    })
                ],
            }),
            dispatch: (tr: Transaction) => {
                this.handleTransaction(tr);
            },
        });

        if (parent) {
            this.parent = parent;
            this.model = parent.model;
        }

        this.contentType = this.getContentType();
        this.childPolicy.value = this.getChildPolicy();
        this.setHighLight(this.contentType);
        this.checkType();

        this.children = shallowReactive(children.map((e) => new Line(e, this)));
        if (this.childPolicy.value === LineChildPolicy.FreeChild && this.children.length === 0) {
            this.appendChild(new Line({ content: "" }));
        }
    }

    /**
     * 创建一个新行
     * @param data 
     * @returns 
     */
    static newLine(data: LineData = { content: ""}) {
        return new Line(data);
    }

    focus() {
        nextTick(() => {
            this.view.focus();
        });
    }

    mount(elm: HTMLElement) {
        elm.appendChild(this.view.dom);
    }

    private getFirstLine() {
        return this.view.state.doc.lineAt(0).text;
    }

    private isEmpty() {
        if (this.getFirstLine().length > 0) return false;
        return this.view.state.doc.lines === 1;
    }

    isDeletable() {
        // 没有父亲则不存在删除的概念
        if (!this.parent) return false;
        // 有子节点则不可删除
        if (this.children.length > 0) return false;
        // 预定义的子节点不可删除
        if (this.parent.childPolicy.value === LineChildPolicy.PreDefinedChild) return false;
        // 对于自由的子节点，如果这是唯一一个则不可删除
        if (this.parent.childPolicy.value === LineChildPolicy.FreeChild
            && this.parent.children.length === 0) return false;
        return true;
    }

    /**
     * 获取model的类型
     */
    getContentType() {
        const firstLine = this.getFirstLine();
        return getContentType(firstLine);
    }

    getChildPolicy() {
        switch (this.contentType) {
            case LineContentType.Dialog: return LineChildPolicy.NoChild;
            case LineContentType.Script: return LineChildPolicy.NoChild;
            case LineContentType.Comment: return LineChildPolicy.NoChild;
            case LineContentType.Order: return LineChildPolicy.NoChild;
            case LineContentType.Template: return LineChildPolicy.NoChild;
        }
    }

    readonly childPolicy: Ref<LineChildPolicy> = ref(LineChildPolicy.NoChild);

    private contentType: LineContentType;

    /**
     * 拦截操作事务
     * @todo 如果当前有子节点，则不允许删除前导标识符
     * @param tr 
     * @returns 
     */
    handleTransaction(tr: Transaction) {
        const view = this.view;
        view.update([ tr ]);
        if (tr.changes.empty) return;
        this.checkType();
    }

    private decorations: DecorationSet;

    checkType() {
        const newType = this.getContentType();
        if (newType !== this.contentType) {
            this.contentType = newType;
            this.setHighLight(this.contentType);
        }
        if (this.contentType !== LineContentType.Script) {
            const { decorations } = checkType(this.view);
            this.decorations = decorations;
        }
    }

    private languageConf = new Compartment();

    setHighLight(type: LineContentType) {
        switch (type) {
            case LineContentType.Dialog:
            case LineContentType.Order:
            case LineContentType.Comment:
                this.view.dispatch({
                    effects: this.languageConf.reconfigure(Dialog())
                });
                return;
            case LineContentType.Script:
                this.view.dispatch({
                    effects: this.languageConf.reconfigure(javascript())
                });
                return;
        }
    }

    // ============ 树操作接口 ============

    previousSibling() {
        if (!this.parent) return null;
        const index = this.parent.findIndexOfLine(this);
        return this.parent.getLineByIndex(index-1) ?? null;
    }

    nextSibling() {
        if (!this.parent) return null;
        const index = this.parent.findIndexOfLine(this);
        return this.parent.getLineByIndex(index+1) ?? null;
    }

    linkParent(line: Line) {
        this.parent = line;
        this.model = line.model;
    }

    unlinkParent() {
        this.parent = void 0;
        this.model = void 0;
    }

    remove() {
        if (!this.parent) throw Error();
        this.parent.removeChild(this);
    }

    appendChild(childNode: Line) {
        if (childNode.parent) {
            childNode.remove();
        }
        this.children.push(childNode);
        console.log(this.children.length, childNode);
        childNode.linkParent(this);
    }

    insertAfter(newNode: Line, referenceNode: Line) {
        const index = this.findIndexOfLine(referenceNode);
        if (index === this.children.length-1) {
            this.appendChild(newNode);
        } else {
            if (newNode.parent) {
                newNode.remove();
            }
            this.children.splice(index+1, 0, newNode);
            newNode.linkParent(this);
        }
    }

    findIndexOfLine(line: Line) {
        return this.children.indexOf(line);
    }

    getLineByIndex(index: number) {
        return this.children[index];
    }

    /**
     * 移除子节点
     * @param childNode 
     * @returns 
     */
    removeChild(childNode: Line) {
        const index = this.findIndexOfLine(childNode);
        this.children.splice(index, 1);
        childNode.unlinkParent();
    }

    getChildrenIds() {
        return computed(() => this.children.map((e) => e.id));
    }
}

export class RootLine extends Line {

    constructor(model: Model, data: LineData[] = []) {
        // 由于model初始化顺序，这里只能使用hack方法来处理
        const line = Line.newLine();
        line.model = model;
        super({ content: "", children: data }, line);
        this.parent = this;
    }

    getChildPolicy(): LineChildPolicy {
        return LineChildPolicy.FreeChild;
    }
}
