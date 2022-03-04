import { syntaxTree } from "@codemirror/language";
import { Decoration, DecorationSet, EditorView, Range } from "@codemirror/view";
import { SyntaxNode } from "@lezer/common";
import { dialog } from "./lib";
import { OrderDefinition, OrderManager, Param } from "./order";
import { zip } from "lodash-es";
import { checkConstraint, ConstraintType } from "./constraint";
import { useLabel } from "./decoration";
import { Diagnostic } from "@codemirror/lint";

export type CheckResult = Partial<{
    decorations: DecorationSet;
    diagnostics: Diagnostic[];
}>;

/**
 * 负责 dialog order subOrder 的检查
 * @todo 需要性能优化时，可以改写为闭包形式
 * @param view 
 * @returns 
 */
export function checkOrder(view: EditorView, namespace?: string): CheckResult {

    const decorations = [] as Range<Decoration>[];
    const diagnostics = [] as Diagnostic[];

    const attachLabel = decorationAttacher(useLabel);
    const attachInfo = diagnosticAttacher("info");
    const attachWarning = diagnosticAttacher("warning");
    const attachError = diagnosticAttacher("error");

    const retval = () => {
        return {
            decorations: Decoration.set(decorations),
            diagnostics,
        }
    };
    
    const input = view.state.doc.toString();
    const tree = syntaxTree(view.state);

    const root = tree.topNode;
    if (root.name !== "Line") throw new Error("");
    const line = root.firstChild;
    if (!line || line.name === "⚠") return retval();

    // line.name: Order | Dialog | Comment
    switch (line.name) {
        case "Order": (() => {
            // OrderHeader = OrderMethod DefaultParam NamedParam*
            const header = line.firstChild;
            if (!header || header.name !== "OrderHeader") throw new Error("");

            // OrderMethod = OrderSymbol OrderName
            const method = header.firstChild;
            if (!method || method.name !== "OrderMethod") throw new Error("");

            const name = method.lastChild;
            /** @todo 错误处理 */
            if (!name || name.name !== "OrderName") {
                attachError(`未填写指令名`, method);
                return;
            };
            const namespacePrefix = namespace ? namespace + " " : "";

            const orderName = getValue(name);
            const definition = OrderManager.get(namespacePrefix + orderName);

            if (!definition) {
                attachError(`指令 [${ orderName }] 未被定义`, method);
                return;
            }

            checkOrder(view, definition);
            return;
        })();
        case "Dialog": {
            const header = line.firstChild;
            if (header && header.name === "DialogHeader") {
                checkOrder(view, dialog);
            }

            break;
        }
        default: {
            throw new Error("");
        }
    }
    return retval();

    function getValue(node: SyntaxNode) {
        return input.slice(node.from, node.to);
    }

    function decorationAttacher<T extends any[]>(useDecoration: (...args: T) => Decoration) {
        return (pos: number, ...rest: T) => {
            decorations.push(useDecoration(...rest).range(pos));
        }
    }

    function diagnosticAttacher (severity: "info" | "warning" | "error") {
        return (message: string, node: SyntaxNode) => {
            const { from, to } = node;
            diagnostics.push({
                from, to, severity, source: "dialogue 语言服务", message,
            });
        }
    }

    type ExtractedParam = [ string, SyntaxNode, boolean ];

    /**
     * ParamValues = (BorderedParamValue | ExpressionParamValue | ParamValue)*
     * @param view 
     * @param node 
     * @returns 
     */
    function extractParams(node: SyntaxNode | null): ExtractedParam[] {
        if (!node) return [];
        if (node.name !== "ParamValues") throw new Error("");

        const getParamValue = (node: SyntaxNode): string => {
            switch (node.name) {
                case "ParamValue":
                    return getValue(node);
                // BorderedParamValue = BorderedStart BorderedParamContent? BorderedEnd
                case "BorderedParamValue": {
                    const contentNode = node.getChild("BorderedParamContent");
                    if (!contentNode) return "";
                    return getValue(contentNode);
                }
                // ExpressionParamValue = ExpressionStart EmbeddedExpression ExpressionEnd
                case "ExpressionParamValue":
                    const contentNode = node.getChild("EmbeddedExpression");
                    if (!contentNode) return "";
                    return getValue(contentNode);
                default: {
                    console.log(node);
                    throw new Error("");
                }
            }
        }
        const children = [];
        for (let child = node.firstChild; child; child = child!.nextSibling) {
            if (child.name === "Space") continue;
            children.push(child);
        }
        return children.map((node) => {
            const value = getParamValue(node);
            return [ value, node, node.name === "ExpressionParamValue" ];
        });
    }

    function checkParams(params: ExtractedParam[], definitions: Param[]) {
        zip(params, definitions).forEach(([ param, definition ]) => {
            if (!param) {
                if (!definition!.optional[0]) {
                    console.log("缺少参数", param);
                }
                return;
            }
            const [ value, node, isExpression ] = param;
            if (!definition) {
                attachError("多余的参数", node);
            } else {
                // 对于表达式类型的值不做检查
                if (isExpression) return;
                const { constraint } = definition;
                const [ accept, reason ] = checkConstraint(value, constraint);
                if (!accept) {
                    if (constraint.type === ConstraintType.Free) throw new Error();
                    attachError([
                        `参数类型错误, ${ value }`,
                        reason ? reason :
                            constraint.label ? `不是${ constraint.label }` : "",
                    ].join(""), node);
                }
            }
        });
    }

    function checkOrder(view: EditorView, definition: OrderDefinition) {
        const tree = syntaxTree(view.state);
        tree.iterate({
            enter: (type, from, to, getNode) => {
                switch (type.name) {
                    // DefaultParam = ParamValues
                    case "DefaultParam": {
                        const defaultParam = getNode();
                        const paramsNode = defaultParam.getChild("ParamValues");
                        const params = extractParams(paramsNode);
                        checkParams(params, definition.params);
                        return;
                    }
                    // NamedParam = ParamName ParamValues
                    // ParamName = ParamSymbol ParamNameContent
                    case "NamedParam": {
                        const namedParam = getNode();
                        const nameNode = namedParam.getChild("ParamName");
                        if (!nameNode) throw new Error("");
                        const nameCententNode = nameNode.getChild("ParamNameContent");
                        if (!nameCententNode) return;
                        const name = getValue(nameCententNode);
                        const paramDefintion = definition.namedParams[name];
                        if (!paramDefintion) {
                            attachError(`未定义的具名参数 -${ name }`, nameNode);
                            return;
                        }
                        if (paramDefintion.label) {
                            attachLabel(nameCententNode.to, `:${ paramDefintion.label }`);
                        }
                        const paramsNode = namedParam.getChild("ParamValues");
                        const params = extractParams(paramsNode);
                        checkParams(params, paramDefintion.params);
                        return;
                    }
                }
            }
        })
    }
}

/**
 * @todo js检查
 * @param view 
 * @returns 
 */
export function checkScript(view: EditorView): CheckResult {
    return {}
}
