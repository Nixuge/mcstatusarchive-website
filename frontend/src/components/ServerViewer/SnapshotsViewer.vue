<script setup lang="ts">
import { useSnapshots } from '@/stores/serverviewer/snapshots';
const { getServerSnapshotsForDateRangeAndCategory } = useSnapshots();

import { useChangeKey } from '@/stores/serverviewer/changekey';
import { computed } from 'vue';
const { getCurrentKey } = useChangeKey();

const len = computed(() => {return getServerSnapshotsForDateRangeAndCategory().length})
</script>

<template>
    <h1 v-if="getCurrentKey() == 'all'">{{ len }} snapshots taken in the selected time period.</h1>
    <h1 v-else>{{ len }} snapshots changing "{{ getCurrentKey()}}" taken in the selected time period.</h1>
</template>