/**
 * @module language
 * dialog 的语言服务
 */

import { DialogLanguage } from "@/grammar";
import { LanguageSupport } from "@codemirror/language";
import { autocompletion } from "./autocompletion";

export function Dialog () {
    return new LanguageSupport(DialogLanguage, DialogLanguage.data.of({
        autocomplete: autocompletion,
    }));
}
