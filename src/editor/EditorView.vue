<script setup lang="ts">
import { Model } from '@/model';
import LineView from './LineView.vue';

/**
 * @todo 粒度更细的热重载
 */
if (import.meta.hot) {
    import.meta.hot.decline();
}

const model = new Model([
    { content: "// 欢迎使用 Dialogue，这是一个几乎纯文本的事件编辑器\n// 熟练使用之后，你可以获得类似于word的写作体验" },
    { content: "在Dialogue中，文本由一系列块组成，每一个块都代表一句对话" },
    { content: "# 伯伯\n特别的，以#开头的语句，其第一行代表这句对话的属性，例如说，本句话是由伯伯说的" },
    { content: "@等待 1000" },
    { content: "# Dialogue\n以@开头的语句，代表一个指令，例如说上面的节点使用了等待指令，因此在实际对话中，要等待1000毫秒才能看到本行\n你可以在下面的空行里调用一个指令，键入@即可查看所有支持的指令" },
    { content: "" },
    { content: "@移动 -t 500\n    向下移动" },
    { content: "# Dialogue\n你可以给指令附加额外的参数以达成更多效果，例如说上面的指令中 -t 500 代表500毫秒移动一步" },
    { content: "$: core.win()" },
    { content: "# Dialogue\n以$:开头的语句代表一段脚本，例如说上面的语句会让你直接获胜" },
    { content: "// $: core.lose()" },
    { content: "# Dialogue\n以//开头的语句会被注释，与js不同，你不需要对每一行都注释，只有处于块开头的注释才有效，嵌入脚本除外" },
    { content: "// ======== 以下是一段对话 ========" },
    { content: "# 伯伯 -f {bobo.jpg} \n看我表演穿墙术" },
    { content: "@移动 -t 500\n    向下移动\n    向下移动\n    向下移动\n    向下移动" },
    { content: "@移动 -t 500\n    向上移动\n    向上移动" },
    { content: "@条件分歧 ${ flags['10funtrap'] }", children: [
        { content: "&成立的场合", children: [
            { content: "@移动 -t 500\n    向上移动\n    向上移动" },
            { content: "# 伯伯 \n神奇吧？想学吧？50金币就教给你！" },
        ] },
        { content: "&不成立的场合", children: [
            { content: "@等待 500" },
            { content: "# 伯伯 \n卧槽" },
            { content: "@跳跃 4,5 -t 500 -h 2px" },
            { content: "# 伯伯 \n卡住了" },
            { content: "# 伯伯 \n快来救我" },
            { content: "# hero \n。。。" },
        ] },
    ] },
    { content: "$: flags['10f'] = true;" },
]);

const lineIds = model.root.getChildrenIds();
</script>
<template>
    <div class="editor-view">
        <template v-for="lineId of lineIds" :key="lineId">
            <LineView :line-id="lineId"></LineView>
        </template>
    </div>
</template>
<style lang="less" scoped>
</style>