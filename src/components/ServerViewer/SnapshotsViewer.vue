<script setup lang="ts">
import { useSnapshots } from '@/stores/serverviewer/snapshots';
const { getServerSnapshotsForDateRangeAndCategory } = useSnapshots();

import { useChangeKey } from '@/stores/serverviewer/changekey';
import { computed } from 'vue';
const { getCurrentKey } = useChangeKey();

const len = computed(() => {return getServerSnapshotsForDateRangeAndCategory().length - 2;})
</script>

<template>
    <h1 v-if="len == -2">Loading...</h1>
    <h1 v-else-if="getCurrentKey() == 'all'">{{ len }} snapshots taken in the selected time period.</h1>
    <h1 v-else>{{ len }} snapshots changing "{{ getCurrentKey()}}" taken in the selected time period.</h1>
</template>