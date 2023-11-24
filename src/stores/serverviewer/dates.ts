import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { dateToUnix, unixToDate } from '@/ts/utils/date';

export const useDates = defineStore('dates', () => {
    // const startRange: Ref<Date> = ref(new Date());
    // const endRange: Ref<Date> = ref(new Date());

    const startRangeUnix: Ref<number> = ref(0);
    const endRangeUnix: Ref<number> = ref(0);

    function setStartEndDates(start: Date, end: Date) {
        // startRange.value = start;
        // endRange.value = end;
        startRangeUnix.value = dateToUnix(start);
        endRangeUnix.value = dateToUnix(end);
    }
    function setStartEndUnix(start: number, end: number) {
        // startRange.value = unixToDate(start);
        // endRange.value = unixToDate(end);
        startRangeUnix.value = start;
        endRangeUnix.value = end;
    }

    function getStartEndUnix() {
        return [startRangeUnix.value, endRangeUnix.value];
    }

    // function getStartEndDate() {
    //     return [startRange.value, endRange.value];
    // }

    function reset() {
        // startRange.value = new Date();
        // endRange.value = new Date();
        startRangeUnix.value = 0;
        endRangeUnix.value = 0;
    }

    return { setStartEndDates, setStartEndUnix, getStartEndUnix, reset }
})
