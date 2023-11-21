<script setup lang="ts">
import PlayercountGraph from './PlayercountGraph.vue'
import RangePicker from './RangePicker.vue'
import ChangePicker from './ChangePicker.vue'
import SnapshotsViewer from './SnapshotsViewer.vue'
import LatestSnapshot from './LatestSnapshot.vue'

import DebugTimings from './debug/Timings.vue'

import { resetAll } from '@/ts/utils/reset'
import { getIp } from '@/ts/utils/route'

import router from '@/router';
import { onMounted } from 'vue';

import { useSnapshots } from '@/stores/serverviewer/snapshots';
const { requestServerSnapshots, getServerSnapshots } = useSnapshots();

import { useTimings } from '@/stores/serverviewer/debug/timings';
const { setShown } = useTimings();


function exit() {
    resetAll();
    router.push('/');
}

onMounted(async() => {
    // If data already there skip loading it
    if (getServerSnapshots().length == 0)
        await requestServerSnapshots(getIp());
});

</script>

<template>
    <span id="goback" @click="exit">&lt; back</span>
    <div id="stats">
        <span id="status" @click="setShown(true)">Load timings</span>
        <h1>Server stats for {{ getIp() }}</h1>
        <LatestSnapshot />
        <PlayercountGraph />
        <div id="pickers">
            <RangePicker />
            <ChangePicker />
        </div>
        <SnapshotsViewer />

        <DebugTimings />
    </div>
</template>

<style scoped>
h1 {
    margin-bottom: 10px;
}
#pickers {
    display: flex;
    padding-left: 45px;
    padding-right: 45px;
}
#pickers > * {
  padding: 5px;
}
#status {
    position: fixed;
    top: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.3);
    padding-bottom: 2px;
    padding-left: 2px;
    cursor: pointer;
}
#stats {
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
