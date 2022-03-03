
import { parser } from "./dialog.grammar"
import { LRLanguage, LanguageSupport, foldNodeProp, foldInside } from "@codemirror/language"
import { styleTags, tags as t } from "@codemirror/highlight"

export const DialogLanguage = LRLanguage.define({
    parser: parser.configure({
        props: [
            // indentNodeProp.add({
            //   Application: delimitedIndent({closing: ")", align: false})
            // }),
            foldNodeProp.add({
                Application: foldInside
            }),
            styleTags({
                DialogSymbol: t.heading,
                OrderSymbol: t.operatorKeyword,
                OrderName: t.controlKeyword,
                Comment: t.comment,
                CommentSymbol: t.comment,
                ParamName: t.variableName,
                BorderedStart: t.angleBracket,
                BorderedEnd: t.angleBracket,
                ExpressionStart: t.keyword,
                ExpressionEnd: t.keyword,
            })
        ]
    }),
})
  
export function Dialog() {
    return new LanguageSupport(DialogLanguage);
}