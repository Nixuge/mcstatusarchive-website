<script setup lang="ts">
import { useTimings } from '@/stores/serverviewer/debug/timings';
const {  getAllTimings } = useTimings();

</script>

<template>
    <h1>Load times</h1>
    <h2 v-for="(timing, key) of getAllTimings()">"{{ key }}": {{ timing.time }}ms <span v-if="timing.comment">({{ timing.comment }})</span></h2>

    <h3>Some timings (graphDisplay) can be incorrect if recalculated multiple times close to each other</h3>
</template>