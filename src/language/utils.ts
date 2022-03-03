import { LineContentType } from "./types";

export function getContentType(content: string) {
    if (content.startsWith("@")) {
        return LineContentType.Order;
    } else if (content.startsWith("$:")) {
        return LineContentType.Script;
    } else if (content.startsWith("&")) {
        return LineContentType.Template;
    } else if (content.startsWith("//")) {
        return LineContentType.Comment;
    }
    return LineContentType.Dialog;
}
