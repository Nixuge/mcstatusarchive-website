<script setup lang="ts">
import { onMounted, ref, watch, type Ref } from 'vue';
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css'

import { unixToDate } from '@/ts/utils/date';

const date: Ref<Date[]> = ref([]);

import { useSnapshots } from '@/stores/serverviewer/snapshots';
const { getServerSnapshots } = useSnapshots();
import { useDates } from '@/stores/serverviewer/dates';
const { setStartEndDates, setStartEndUnix } = useDates();

let minDate: Ref<Date | undefined> = ref(undefined);
let maxDate: Ref<Date | undefined> = ref(undefined);

function getTimestamp(elem: any): number {
    if (typeof elem === 'number') return elem;
    if (elem && typeof elem.save_time === 'number') return elem.save_time;
    return 0;
}

watch(date, () => {
    // if click on "x"
    if (date.value == null) { 
        const snapshots = getServerSnapshots();
        if (snapshots.length == 0) return;
        const firstUnix = getTimestamp(snapshots[0]);
        const lastUnix = getTimestamp(snapshots[snapshots.length - 1]);
        date.value = [unixToDate(firstUnix), unixToDate(lastUnix)]
        setStartEndUnix(firstUnix, lastUnix);
        return;
    } 
    // If setting normal date
    const startRangeDate = date.value[0] as Date;
    const endRangeDate = date.value[1] as Date;
    if (startRangeDate && endRangeDate && !isNaN(startRangeDate.getTime()) && !isNaN(endRangeDate.getTime())) {
        setStartEndDates(startRangeDate, endRangeDate)
    }
})

function updateMinMaxDate() {
    const snapshots = getServerSnapshots();
    if (!snapshots || snapshots.length == 0)
        return;

    const firstUnix = getTimestamp(snapshots[0]);
    const lastUnix = getTimestamp(snapshots[snapshots.length - 1]);
    if (firstUnix === 0 || lastUnix === 0) return;

    minDate.value = unixToDate(firstUnix);
    maxDate.value = unixToDate(lastUnix);
    date.value = [minDate.value, maxDate.value]
    setStartEndUnix(firstUnix, lastUnix);
}

watch(() => getServerSnapshots(), (snapshots) => {
    if (snapshots && snapshots.length > 0) {
        updateMinMaxDate();
    }
}, { immediate: true });

onMounted(() => {
    updateMinMaxDate();
})
</script>

<template>
    <VueDatePicker teleport-center dark v-model="date" :min-date="minDate" :max-date="maxDate" :start-date="minDate" range />
</template>

<style>
.dp__main {
    /* width: 50%; */
    margin: auto;
}
</style>