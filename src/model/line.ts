import { closeBrackets } from "@codemirror/closebrackets";
import { Compartment, EditorState, Transaction } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, keymap, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { computed, nextTick, Ref, ref, shallowReactive } from "vue";
import { lightplus } from "@/theme";
import { Model } from ".";
import { javascript } from "@codemirror/lang-javascript";
import { Dialog } from "@/language";
import { LineChildPolicy, LineContentType } from "@/language/types";
import { getContentType } from "@/language/utils";
import { checkOrder, CheckResult, checkScript } from "@/language/checker";
import { bracketMatching } from "@codemirror/matchbrackets";
import { autocompletion } from "@codemirror/autocomplete";
import { Diagnostic, linter } from "@codemirror/lint";
import { myKeymap } from "./command";
import { queryOrderName } from "@/language/query";
import { OrderManager } from "@/language/order";

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
                    bracketMatching(),
                    closeBrackets(),
                    autocompletion({}),
                    this.languageConf.of([]),
                    linter(() => this.diagnostics),
                    myKeymap(this),
                    ViewPlugin.define(() => ({}), {
                        decorations: () => this.decorations,
                    })
                ],
            }),
            dispatch: (tr: Transaction) => {
                this.handleTransaction(tr);
            },
        });

        // 时序: 初始化属性 - 初始化子节点 - 类型检查
        this.contentType = this.getContentType();
        this.childPolicy = this.getChildPolicy();
        this.setLanguage(this.contentType);

        this.children = shallowReactive(children.map((e) => new Line(e, this)));
        if (parent) {
            this.linkParent(parent);
        }
        this.languageWork();
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
        // 如果当前dom不在视口内，则滚动画面以对准dom
        /** @todo 对于封装好的编辑器，允许定义容器dom */
        const dom = this.view.dom;
        const rect = dom.getBoundingClientRect();
        if (rect.top <= 0) {
            dom.scrollTo({
                top: 0,
                behavior: "auto",
            });
        } else if (rect.bottom >= window.innerHeight) {
            dom.scrollTo({
                top: dom.scrollHeight,
            });
        }
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

    isEmpty() {
        if (this.getFirstLine().length > 0) return false;
        return this.view.state.doc.lines === 1;
    }

    isDeletable() {
        // 没有父亲则不存在删除的概念
        if (!this.parent) return false;
        // 有子节点则不可删除
        if (this.children.length > 0) return false;
        // 预定义的子节点不可删除
        if (this.parent.childPolicy === LineChildPolicy.PreDefinedChild) return false;
        // 对于自由的子节点，如果这是唯一一个则不可删除
        if (this.parent.childPolicy === LineChildPolicy.FreeChild
            && this.parent.children.length === 1) return false;
        return true;
    }

    /**
     * 获取model的类型
     */
    getContentType() {
        const firstLine = this.getFirstLine();
        return getContentType(firstLine);
    }

    /**
     * 获取当前的指令名，如果当前不是指令，则返回null
     */
    getOrderName(): string | null {
        switch (this.contentType) {
            case LineContentType.Dialog:
            case LineContentType.Script:
            case LineContentType.Comment:
                return null;
            case LineContentType.Order: {
                return queryOrderName(this.view.state);
            }
            case LineContentType.SubOrder: {
                const name = queryOrderName(this.view.state);
                if (!name) return null;
                if (!this.parent) return null;
                const parentName = this.parent.getOrderName();
                if (!parentName) return null;
                /** @todo 封装子指令的连接方法 */
                return parentName + " " + name;
            }
        }
    }

    getChildPolicy() {
        switch (this.contentType) {
            case LineContentType.Dialog:
            case LineContentType.Script:
            case LineContentType.Comment:
                return LineChildPolicy.NoChild;
            case LineContentType.Order: 
            case LineContentType.SubOrder: {
                const name = this.getOrderName();
                // 没有指令名时，默认为无子节点
                if (!name) return LineChildPolicy.NoChild;
                const definition = OrderManager.get(name);
                if (!definition) return LineChildPolicy.NoChild;
                return definition.childPolicy;
            }
        }
    }

    private childPolicy: LineChildPolicy;

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
        this.languageWork();
    }

    private decorations: DecorationSet;
    private diagnostics: Diagnostic[] = [];

    languageWork() {
        const nowType = this.getContentType();
        if (nowType !== this.contentType) {
            this.contentType = nowType;
            this.setLanguage(this.contentType);
        }
        const { decorations = Decoration.set([]), diagnostics = [] } = ((): CheckResult => {
            switch(this.contentType) {
                case LineContentType.Dialog:
                case LineContentType.Order:
                    return checkOrder(this.view);
                case LineContentType.SubOrder: {
                    if (!this.parent) return {};
                    return checkOrder(this.view, this.parent.getOrderName() ?? void 0);
                }
                case LineContentType.Comment:
                    return {};
                case LineContentType.Script:
                    return checkScript(this.view);
            }
        })();
        this.decorations = decorations;
        this.diagnostics = diagnostics;
        if (this.contentType !== LineContentType.Script) {
        } else {
            this.diagnostics = [];
        }
        this.childPolicy = this.getChildPolicy();
        if (this.children.length === 0) {
            if (this.childPolicy === LineChildPolicy.FreeChild) {
                this.appendChild(new Line({ content: "" }));
            } else if (this.childPolicy === LineChildPolicy.PreDefinedChild) {
                const name = this.getOrderName();
                if (!name) throw new Error("");
                const definition = OrderManager.get(name);
                if (definition?.initChildren) {
                    definition.initChildren.forEach((e) => {
                        this.appendChild(new Line(e));
                    })
                }
            }
        }
    }

    private languageConf = new Compartment();

    setLanguage(type: LineContentType) {
        switch (type) {
            case LineContentType.Dialog:
            case LineContentType.Order:
            case LineContentType.Comment:
            case LineContentType.SubOrder:
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

    setModel(model: Model | undefined) {
        this.model = model;
        this.children.forEach((e) => {
            e.setModel(model);
        });
        this.languageWork();
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
        this.setModel(this.parent.model);
    }

    unlinkParent() {
        this.parent = void 0;
        this.setModel(void 0);
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
        super({ content: "", children: data });
        this.parent = this;
        this.setModel(model);
    }

    getChildPolicy(): LineChildPolicy {
        return LineChildPolicy.FreeChild;
    }
}
