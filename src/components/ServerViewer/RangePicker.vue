<script setup lang="ts">
import { onMounted, ref, watch, type Ref } from 'vue';
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css'

const date: Ref<Date[]> = ref([]);

import { useSnapshots } from '@/stores/serverviewer/snapshots';
const { getServerSnapshots } = useSnapshots();
import { useDates } from '@/stores/serverviewer/dates';
const { setStartEndDates } = useDates();

let minDate: Ref<Date> = ref(new Date());
let maxDate: Ref<Date> = ref(new Date());

watch(date, () => {
    const startRangeDate = date.value[0] as Date;
    const endRangeDate = date.value[1] as Date;
    setStartEndDates(startRangeDate, endRangeDate)
})

function updateMinMaxDate() {
    const snapshots = getServerSnapshots();
    if (snapshots.length == 0)
        return;

    minDate.value = snapshots[0].save_date;
    maxDate.value = snapshots[snapshots.length - 1].save_date;
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
    <VueDatePicker :dark="true" v-model="date" :min-date="minDate" :max-date="maxDate" :start-date="minDate" range />
</template>

<style>
.dp__main {
    width: 50%;
    margin: auto;
}
</style>