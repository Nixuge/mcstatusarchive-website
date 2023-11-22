<script setup lang="ts">
import { onMounted, ref, watch, type Ref, computed, onBeforeUnmount } from 'vue';

//@ts-ignore
let canShowRam = (window.performance && window.performance.memory);

let loop: NodeJS.Timeout;
const mem = ref();
const displayComplete = ref(false);

function formatBytes(bytes: number, decimals = 1) {
    if (!+bytes) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))}${sizes[i]}`
}

function startLoop() {
    loop = setInterval(() => {
        if (!canShowRam) {
            mem.value = "Chromium only."
            clearInterval(loop);
            return;
        }
        //@ts-ignore
        mem.value = window.performance.memory;
    }, 1000);
}

onMounted(() => {
    startLoop();
})

onBeforeUnmount(() => {
    clearInterval(loop);
})

</script>

<template>
    <h1>Ram info<button v-if="canShowRam" @click="displayComplete = !displayComplete">{{ displayComplete ? "Show less" : "Show more" }}</button></h1>
    <h2 v-if="(typeof mem == 'undefined')">Loading...</h2>
    <h2 v-else-if="(typeof mem == 'string')">{{ mem }}</h2>
    <h2 v-else-if="canShowRam && !displayComplete">
        {{ formatBytes(mem.usedJSHeapSize) }}/{{ formatBytes(mem.totalJSHeapSize) }}
        ({{ formatBytes(mem.jsHeapSizeLimit) }} max)
    </h2>
    <h2 v-else-if="canShowRam && displayComplete">jsHeapSizeLimit: {{ formatBytes(mem.jsHeapSizeLimit, 3) }}<br>
        usedJSHeapSize: {{ formatBytes(mem.usedJSHeapSize, 3) }}<br>
        totalJSHeapSize: {{ formatBytes(mem.totalJSHeapSize, 3) }}
    </h2>
</template>

<style scoped>
    button {
        cursor: pointer;
        background: transparent;
        color: #fff;
        margin-left: 10px;
        transform: translateY(-.3em); /* Center vertically */
        border: 1px solid #fff;
    }
</style>