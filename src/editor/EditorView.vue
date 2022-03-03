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
    { content: "// 以下是一段对话" },
    { content: "# 伯伯 -f {bobo.jpg} \n看我表演穿墙术" },
    { content: "@移动 -t 500\n    向下移动\n    向下移动\n    向下移动\n    向下移动" },
    { content: "@移动 -t 500\n    向上移动\n    向上移动" },
    { content: "@等待 500" },
    { content: "# 伯伯 \n卧槽" },
    { content: "@跳跃 4,5 -t 500 -h 2px" },
    { content: "# 伯伯 \n卡住了" },
    { content: "# 伯伯 \n快来救我" },
    { content: "# hero \n。。。" },
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