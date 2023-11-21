<script setup lang="ts">
import { onMounted, ref, watch, type Ref } from 'vue';
import { useTimings, timingKeys } from '@/stores/serverviewer/debug/timings';
const { getTiming, isShown, setShown } = useTimings();

// watch(getTiming, () => {
    
// })

onMounted(() => {

})
</script>

<template>
    <div v-if="isShown()" id="debugwindowwrap" @click="setShown(false)">
        <div id="debugwindow" @click.stop="">
            <h1>Load times</h1>
            <h2 v-for="key of timingKeys">"{{ key }}": {{ getTiming(key) }}ms</h2>
        </div>
    </div>
</template>

<style scoped>
#debugwindow {
    cursor: auto;
    text-align: left;
    padding: 20px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 60%;
    height: 70%;
    background-color: rgba(0, 0, 0, 0.4);
}
#debugwindowwrap {
    cursor: pointer;
    -webkit-backdrop-filter: blur(5px);
    backdrop-filter: blur(5px);
    background-color: rgba(0, 0, 0, 0.4);
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
}
</style>