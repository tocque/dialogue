<script setup lang="ts">
import EditorView from './editor/EditorView.vue';

</script>

<template>
  <div class="main">
    <div class="title">
      <h2>Dialogue</h2>
      <span class="version">v0.0.1</span>
    </div>
    <EditorView></EditorView>
  </div>
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* text-align: center; */
  color: #2c3e50;
  margin-top: 60px;
}
.main {
  width: 1000px;
  margin: auto;
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
