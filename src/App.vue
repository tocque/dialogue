<script setup lang="ts">
import EditorView from './editor/EditorView.vue';

</script>

<template>
  <div class="main">
    <h2>Dialogue</h2>
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
.main-view {
  width: 1000px;
  margin: auto;
}
</style>
