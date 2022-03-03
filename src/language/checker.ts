import { syntaxTree } from "@codemirror/language";
import { DecorationSet, EditorView } from "@codemirror/view";
import { SyntaxNode } from "@lezer/common";
import { dialog } from "./lib";
import { OrderDefinition, OrderManager, Param } from "./order";
import { zip } from "lodash-es";
import { checkConstraint } from "./constraint";

const getValue = (view: EditorView, node: SyntaxNode) => {
    return view.state.doc.sliceString(node.from, node.to);
}

type ExtractedParam = [ string, boolean, number, number ];

/**
 * ParamValues = (BorderedParamValue | ExpressionParamValue | ParamValue)*
 * @param view 
 * @param node 
 * @returns 
 */
function extractParams(view: EditorView, node: SyntaxNode | null): ExtractedParam[] {
    if (!node) return [];
    if (node.name !== "ParamValues") throw new Error("");

    const getParamValue = (node: SyntaxNode): string => {
        switch (node.name) {
            case "ParamValue":
                return getValue(view, node);
            // BorderedParamValue = BorderedStart BorderedParamContent? BorderedEnd
            case "BorderedParamValue": {
                const contentNode = node.getChild("BorderedParamContent");
                if (!contentNode) return "";
                return getValue(view, contentNode);
            }
            // ExpressionParamValue = ExpressionStart EmbeddedExpression ExpressionEnd
            case "ExpressionParamValue":
                const contentNode = node.getChild("EmbeddedExpression");
                if (!contentNode) return "";
                return getValue(view, contentNode);
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
        return [ value, node.name === "ExpressionParamValue", node.from, node.to ];
    });
}

function checkParams(view: EditorView, params: ExtractedParam[], definitions: Param[]) {
    zip(params, definitions).forEach(([ param, definition ]) => {
        if (param && !definition) {
            console.log("多余的参数", param);
        } else if (!param && definition) {
            if (!definition.optional[0]) {
                console.log("缺少参数", param);
            }
        } else if (param && definition) {
            // 对于表达式类型的值不做检查
            if (param[1]) return;
            const [ accept, reason ] = checkConstraint(param[0], definition.constraint);
            if (!accept) {
                console.log(reason);
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
                    const params = extractParams(view, paramsNode);
                    checkParams(view, params, definition.params);
                    return;
                }
                // NamedParam = ParamName ParamValues
                // ParamName = ParamSymbol ParamNameContent
                case "NamedParam": {
                    const namedParam = getNode();
                    const nameNode = namedParam.getChild("ParamName");
                    if (!nameNode) throw new Error("");
                    const nameCententNode = nameNode.getChild("ParamNameContent");
                    if (!nameCententNode) throw new Error("");
                    const name = getValue(view, nameCententNode);
                    console.log("name");
                    if (!(name in definition.namedParams)) {
                        console.log("未定义的具名参数", name);
                        return;
                    }
                    const paramsNode = namedParam.getChild("ParamValues");
                    const params = extractParams(view, paramsNode);
                    console.log(params);
                    checkParams(view, params, definition.namedParams[name].params);
                    return;
                }
            }
        }
    })
}

interface TypeCheckResult {
    decorations: DecorationSet;
}

export function checkType(view: EditorView): TypeCheckResult {
    const tree = syntaxTree(view.state);
    const root = tree.topNode;
    if (root.name !== "Line") throw new Error("");
    const line = root.firstChild;
    if (!line || line.name === "⚠") return;

    const decorations = [];
    // line.name: Order | Dialog | Comment
    switch (line.name) {
        case "Order": {
            // OrderHeader = OrderMethod DefaultParam NamedParam*
            const header = line.firstChild;
            if (!header || header.name !== "OrderHeader") throw new Error("");

            // OrderMethod = OrderSymbol OrderName
            const method = header.firstChild;
            /** @todo 错误处理 */
            if (!method || method.name !== "OrderMethod") return;

            const name = method.lastChild;
            /** @todo 错误处理 */
            if (!name || name.name !== "OrderName") break;

            const orderName = getValue(view, name);
            const definition = OrderManager.get(orderName);

            /** @todo 错误处理 */
            if (!definition) {
                console.log("未定义的指令", orderName);
                break;
            }

            checkOrder(view, definition);
            return;
        }
        case "Dialog": {
            const header = line.firstChild;
            if (!header || header.name !== "DialogHeader") throw new Error("");

            checkOrder(view, dialog);

            return;
        }
        case "Comment": {
            return;
        }
        default: {
            throw new Error("");
        }
    }
}
