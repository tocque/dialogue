/**
 * @module language/lib
 * 语言的指令定义
 */

import { constraintPreset } from "./constraint";
import { defineNamedParams, defineOrder, defineParamList, OrderManager } from "./order";

export const dialog = defineOrder("对话", {
    params: defineParamList([], [
        [ constraintPreset.Free, [ "名称", "对话者的名称" ] ],
    ]),
    namedParams: defineNamedParams({
        "f": [ defineParamList([
            [ constraintPreset.Free ],
        ]), [ "立绘" ] ]
    }),
});

OrderManager.register(defineOrder("移动", {
    params: defineParamList([], [
        [ constraintPreset.Free, [ "移动对象", "移动对象，默认为本事件" ] ],
    ]),
    namedParams: defineNamedParams({
        "t": [ defineParamList([
            [ constraintPreset.RangeInt(0, 5000) ],
        ]), [ "移动速度", "移动速度，参数代表每一步的时间" ] ]
    }),
}))
