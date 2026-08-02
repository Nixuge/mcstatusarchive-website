import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { dateToUnix, unixToDate } from '@/ts/utils/date';

export const useDates = defineStore('dates', () => {
    const startRangeUnix: Ref<number> = ref(0);
    const endRangeUnix: Ref<number> = ref(0);

    function setStartEndDates(start: Date, end: Date) {
        startRangeUnix.value = dateToUnix(start);
        if (end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0) {
            const endOfDay = new Date(end);
            endOfDay.setHours(23, 59, 59, 999);
            endRangeUnix.value = dateToUnix(endOfDay);
        } else {
            endRangeUnix.value = dateToUnix(end);
        }
    }

    function setStartEndUnix(start: number, end: number) {
        startRangeUnix.value = start;
        endRangeUnix.value = end;
    }

    function getStartEndUnix() {
        return [startRangeUnix.value, endRangeUnix.value];
    }

    function reset() {
        startRangeUnix.value = 0;
        endRangeUnix.value = 0;
    }

    return { setStartEndDates, setStartEndUnix, getStartEndUnix, reset }
})
