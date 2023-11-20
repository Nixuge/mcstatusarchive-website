<script setup lang="ts">
import { useSnapshots } from '@/stores/serverviewer/snapshots';
const { getServerSnapshotsForDateRangeAndCategory } = useSnapshots();
</script>

<template>
    <h1>{{ getServerSnapshotsForDateRangeAndCategory().length }} snapshots taken in the selected time period.</h1>
</template>