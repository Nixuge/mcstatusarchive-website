<script setup lang="ts">
import { onMounted, ref, watch, type Ref } from 'vue';
import { useTimings, keyOrder } from '@/stores/serverviewer/debug/timings';
const { getTiming, isShown, setShown, getAllTimings } = useTimings();

// watch(getTiming, () => {
    
// })

onMounted(() => {

})
</script>

<template>
    <div v-if="isShown()" id="debugwindowwrap" @click="setShown(false)">
        <div id="debugwindow" @click.stop="">
            <h1>Load times</h1>
            <h2 v-for="key of keyOrder">"{{ key }}": {{ getTiming(key) }}ms</h2>

            <h3><br>Some timings (graphDisplay) can be incorrect if recalculated multiple times close to each other</h3>
        </div>
    </div>
</template>

<style scoped>
/* h3 {
    position: absolute;
    bottom: 20px;
} */
#debugwindow {
    overflow: auto;
    cursor: auto;
    text-align: left;
    padding: 20px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 70%;
    height: 80%;
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