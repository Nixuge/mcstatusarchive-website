<script setup lang="ts">
import { useSnapshots } from '@/stores/serverviewer/snapshots';
const { getServerSnapshotsForDateRangeAndCategory } = useSnapshots();

import { useChangeKey } from '@/stores/serverviewer/changekey';
const { getCurrentKey } = useChangeKey();
</script>

<template>
    <h1 v-if="getCurrentKey() == 'All'">{{ getServerSnapshotsForDateRangeAndCategory().length }} snapshots taken in the selected time period.</h1>
    <h1 v-else>{{ getServerSnapshotsForDateRangeAndCategory().length }} snapshots changing "{{ getCurrentKey()}}" taken in the selected time period.</h1>
</template>