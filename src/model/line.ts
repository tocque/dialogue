import { closeBrackets } from "@codemirror/closebrackets";
import { Compartment, EditorState, Transaction } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { computed, nextTick, Ref, ref, shallowReactive } from "vue";
import { lightplus } from "@/theme";
import { Model } from ".";
import { javascript } from "@codemirror/lang-javascript";
import { Dialog, Order } from "@/language";

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

/**
 * 行的内容类型
 */
export enum LineContentType {
    Dialog,
    Order,
    Script,
    Template,
}

/**
 * 行的子节点策略
 */
export enum LineChildPolicy {
    /** 没有子节点 */
    NoChild,
    /** 自由添加子节点 */
    FreeChild,
    /** 模板子节点，可以使用一个模板来添加节点 */
    TemplateChild,
    /** 预定义子节点 */
    PreDefinedChild,
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

        this.view = new EditorView({
            state: EditorState.create({
                doc: content,
                extensions: [
                    lightplus,
                    closeBrackets(),
                    this.languageConf.of([]),
                    // Dialog(),
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
        if (firstLine.startsWith("@")) {
            return LineContentType.Order;
        } else if (firstLine.startsWith("$:")) {
            return LineContentType.Script;
        } else if (firstLine.startsWith("&")) {
            return LineContentType.Template;
        }
        return LineContentType.Dialog;
    }

    getChildPolicy() {
        switch (this.contentType) {
            case LineContentType.Dialog: return LineChildPolicy.NoChild;
            case LineContentType.Script: return LineChildPolicy.NoChild;
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
        
        const newType = this.getContentType();
        console.log(newType, this.contentType);
        if (newType !== this.contentType) {
            this.contentType = newType;
            this.setHighLight(this.contentType);
        }
    }

    private languageConf = new Compartment();

    setHighLight(type: LineContentType) {
        switch (type) {
            case LineContentType.Dialog:
                this.view.dispatch({
                    effects: this.languageConf.reconfigure(Dialog())
                });
                return;
            case LineContentType.Order:

                this.view.dispatch({
                    effects: this.languageConf.reconfigure(Order())
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
