<script setup lang="ts">
import { API_URL } from '@/constants';
import router from '@/router';
import { onMounted, ref, type Ref } from 'vue';

const params = router.currentRoute.value.params;
const ip = params.server;

const refJson = ref(null) as unknown as Ref<HTMLSpanElement>;

onMounted(async() => {
    console.log("Loading content...");
    
    const thing = await fetch(`${API_URL}/get_all_server_data/${ip}`)
        .then(data => data.json());

    console.log("loaded content.");
    console.log(thing);
    
    refJson.value.textContent = "Loaded content successfully ! Page is in WIP."
})
</script>

<template>
  <div class="about">
    <h1>This is an about page for server {{ ip }}</h1>
    <span ref="refJson"></span>
  </div>
</template>

<style>

</style>
