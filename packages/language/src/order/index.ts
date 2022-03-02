
import { parser} from "./order-text.grammar"
import { LRLanguage, LanguageSupport, foldNodeProp, foldInside } from "@codemirror/language"
import { styleTags, tags as t } from "@codemirror/highlight"

export const OrderLanguage = LRLanguage.define({
    parser: parser.configure({
        props: [
            // indentNodeProp.add({
            //   Application: delimitedIndent({closing: ")", align: false})
            // }),
            foldNodeProp.add({
                Application: foldInside
            }),
            styleTags({
                MethodSymbol: t.operatorKeyword,
                MethodName: t.controlKeyword,
                ParamName: t.variableName,
                BorderedStart: t.angleBracket,
                BorderedEnd: t.angleBracket,
                ExpressionStart: t.keyword,
                ExpressionEnd: t.keyword,
            })
        ]
    }),
})
  
export function Order() {
    return new LanguageSupport(OrderLanguage);
}