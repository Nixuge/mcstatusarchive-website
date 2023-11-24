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

let minDate: Ref<Date> = ref(new Date());
let maxDate: Ref<Date> = ref(new Date());

watch(date, () => {
    // if click on "x"
    if (date.value == null) { 
        const snapshots = getServerSnapshots();
        const firstUnix = snapshots[0].save_time;
        const lastUnix = snapshots[snapshots.length - 1].save_time;
        date.value = [unixToDate(firstUnix), unixToDate(lastUnix)]
        setStartEndUnix(firstUnix, lastUnix);
        return;
    } 
    // If setting normal date
    const startRangeDate = date.value[0] as Date;
    const endRangeDate = date.value[1] as Date;
    setStartEndDates(startRangeDate, endRangeDate)
})

function updateMinMaxDate() {
    const snapshots = getServerSnapshots();
    if (snapshots.length == 0)
        return;

    minDate.value = unixToDate(snapshots[0].save_time);
    maxDate.value = unixToDate(snapshots[snapshots.length - 1].save_time);
    date.value = [minDate.value, maxDate.value]
}

watch(getServerSnapshots, () => {
    updateMinMaxDate();
});
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