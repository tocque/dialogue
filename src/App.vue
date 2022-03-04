<script setup lang="ts">
import EditorView from './editor/EditorView.vue';

</script>

<template>
    <div class="main">
        <div class="title">
            <h2>Dialogue</h2>
            <span class="version">v0.1.0</span>
        </div>
        <EditorView></EditorView>
    </div>
</template>

<style lang="less">
#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    /* text-align: center; */
    color: #2c3e50;
}
</style>
<style lang="less" scoped>
.main {
    margin: auto;
    @media screen and (min-width: 1000px) {
        width: 1000px;
    }
    @media screen and (max-width: 999px) {
        width: 100%;
    }
}
.title {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
}
.version {
    margin: 20px 10px;
}
</style>
