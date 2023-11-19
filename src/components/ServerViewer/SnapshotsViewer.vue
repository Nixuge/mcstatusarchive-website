<script setup lang="ts">
import { useSnapshots } from '@/stores/serverviewer/snapshots';
const { getServerSnapshotsForDateRange } = useSnapshots();
</script>

<template>
    <h1>{{ getServerSnapshotsForDateRange().length }} snapshots taken in the selected time period.</h1>
</template>