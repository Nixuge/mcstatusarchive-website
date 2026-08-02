<script setup lang="ts">
import { useTimings } from '@/stores/serverviewer/debug/timings';
const { isShown, setShown } = useTimings();

import Timings from './Timings.vue'
import Ram from './Ram.vue'

</script>

<template>
    <div v-if="isShown()" id="debugwindowwrap" @click="setShown(false)">
        <div id="debugwindow" @click.stop="">
            <Timings />
            <br>
            <Ram />
        </div>
    </div>
</template>

<style scoped>
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