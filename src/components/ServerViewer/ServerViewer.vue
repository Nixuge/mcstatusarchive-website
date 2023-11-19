<script setup lang="ts">
import { API_URL } from '@/constants';
import { type ServerSnapshot } from '@/ts/types/serversnapshot'
import router from '@/router';
import { onMounted, ref, type Ref } from 'vue';
import PlayercountGraph from './PlayercountGraph.vue'

import { useSnapshots } from '@/stores/serverviewer/snapshots';
const { requestServerSnapshots } = useSnapshots();

const params = router.currentRoute.value.params;
const ip = params.server as string;

const refJson = ref(null) as unknown as Ref<HTMLSpanElement>;

onMounted(async() => {
    refJson.value.textContent = "Loading content..."
    
    await requestServerSnapshots(ip);

    refJson.value.textContent = "Loaded & converted content successfully !"
});

</script>

<template>
  <div class="about">
    <h1>This is an about page for server {{ ip }}</h1>
    <span ref="refJson"></span>
    <PlayercountGraph />
  </div>
</template>

<style>

</style>
