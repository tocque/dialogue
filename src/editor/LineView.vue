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

</script>
<template>
    <div class="container" ref="container"></div>
    <!-- <div v-if="brenches.length > 0">

    </div> -->
</template>
<style lang="less" scoped>
.container {
    margin: 2px;
    padding: 2px;
    background: #EEEEEE;
}
.container::v-deep .cm-line {
    font-family: Menlo, Monaco, "Courier New", monospace;
}
</style>