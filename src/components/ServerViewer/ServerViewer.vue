<script setup lang="ts">
import PlayercountGraph from './PlayercountGraph.vue'
import RangePicker from './RangePicker.vue'
import SnapshotsViewer from './SnapshotsViewer.vue'
import LatestSnapshot from './LatestSnapshot.vue'

import router from '@/router';
import { onMounted, ref, type Ref } from 'vue';

import { useSnapshots } from '@/stores/serverviewer/snapshots';
const { requestServerSnapshots, reset: resetSnapshots } = useSnapshots();
import { useDates } from '@/stores/serverviewer/dates';
const { reset: resetDates } = useDates();

const params = router.currentRoute.value.params;
const ip = params.server as string;

const refJson = ref(null) as unknown as Ref<HTMLSpanElement>;

function exit() {
    resetSnapshots();
    resetDates();
    router.push('/');
}

onMounted(async() => {
    refJson.value.textContent = "Loading content..."
    await requestServerSnapshots(ip);
    refJson.value.textContent = "Loaded & converted content successfully !"
});

</script>

<template>
  <span id="goback" @click="exit">&lt; back</span>
  <div class="stats">
    <span class="status">Status: <span ref="refJson"></span></span>
    <h1>Server stats for {{ ip }}</h1>
    <LatestSnapshot />
    <PlayercountGraph />
    <RangePicker />
    <SnapshotsViewer />
  </div>
</template>

<style scoped>
h1 {
  margin-bottom: 10px;
}
.status {
  position: fixed;
  top: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.3);
  padding-bottom: 2px;
  padding-left: 2px;
}
.stats {
  text-align: center;
}
#goback {
  position: fixed;
  top: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.3);
  padding: 2px;
  /* border-radius: 5px; */
  cursor: pointer;
}
</style>
