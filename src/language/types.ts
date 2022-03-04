
/**
 * 行的内容类型
 */
export enum LineContentType {
    Dialog,
    Order,
    Script,
    Comment,
    SubOrder,
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