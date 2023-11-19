<script setup lang="ts">
import router from '@/router';

const params = router.currentRoute.value.params;
const ip = params.server;
</script>

<template>
  <div class="about">
    <h1>This is an about page for server {{ ip }}</h1>
  </div>
</template>

<style>

</style>
