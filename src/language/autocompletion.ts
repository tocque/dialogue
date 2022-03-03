/**
 * @module language/autocompletion
 * 处理自动补全的部分
 */
import { Completion, CompletionContext, CompletionSource } from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language"
import { SyntaxNode } from "@lezer/common";
import { OrderManager } from "./order";

function createOrderCompletion(orderName: string): Completion {
    return {
        label: orderName, type: "function", apply: orderName + " "
    }
}

/**
 * 自动补全实现，包括
 *  - 指令名补全
 *  - @todo 具名参数补全
 *  - @todo 枚举补全
 * @param context 
 * @returns 
 */
export const autocompletion: CompletionSource = (context: CompletionContext) => {
    const nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1) as SyntaxNode;
    if (!nodeBefore) return null;
    
    // OrderSymbol/OrderName - 返回可用的指令列表
    if (nodeBefore.name === "OrderSymbol" || nodeBefore.name === "OrderName") {
        return {
            from: nodeBefore.to,
            options: OrderManager.list()
                .map(createOrderCompletion),
        }
    }

    // ParamSymbol - 具名参数补全
    if (nodeBefore.name === "ParamSymbol") {
        
    }

    return null;
}
