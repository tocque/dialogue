<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getLineById } from '../model/line';

const { lineId } = defineProps<{ lineId: number }>();

const line = getLineById(lineId);

if (!line) throw Error(`${ lineId }`);

const container = ref(null as HTMLElement | null);

onMounted(() => {
    if (!container.value) throw Error();
    line.mount(container.value);
});

const childrenIds = line.getChildrenIds();

</script>
<template>
    <div class="line">
        <div class="container" ref="container"></div>
        <template v-for="lineId of childrenIds" :key="lineId">
            <LineView class="child-line" :line-id="lineId"></LineView>
        </template>
    </div>
</template>
<style lang="less" scoped>
.line {
    margin: 2px;
    background: #F8F8F8;
}
.container {
    padding: 2px;
    background: #EEEEEE;
}
.child-line {
    margin-left: 24px;
}
.container::v-deep {
    .cm-line {
        font-size: 16px;
        font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
    }
    .cm-label-widget {
        padding: 1px 4px;
        margin: 0 2px;
        border-radius: 2px;
        font-size: 14px;
        color: #747474;
        background-color: #DDDDDD;
    }
}
</style>