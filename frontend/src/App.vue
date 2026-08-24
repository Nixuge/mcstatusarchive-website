<script setup lang="ts">
import { useRoute, RouterView } from 'vue-router';
const route = useRoute();
</script>

<template>
  <div :class="['app-container', { 'minestats-page': route.name === 'graph' || route.name === 'stats' }]">
    <RouterView />
  </div>
</template>

<style scoped>
.app-container {
  height: 100%;
  width: 100%;
}
</style>
