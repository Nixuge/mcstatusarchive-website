import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import type { ServerSnapshot } from '@/ts/types/serversnapshot';
import { API_URL } from '@/constants';
import { useSnapshots } from './snapshots';

export const useDates = defineStore('dates', () => {
    const startRange: Ref<Date> = ref(new Date());
    const endRange: Ref<Date> = ref(new Date());

    const startRangeUnix: Ref<number> = ref(0);
    const endRangeUnix: Ref<number> = ref(0);

    async function setStartEndDates(start: Date, end: Date) {
        startRange.value = start;
        endRange.value = end;
        startRangeUnix.value = parseInt((start.getTime() / 1000).toFixed(0));
        endRangeUnix.value = parseInt((end.getTime() / 1000).toFixed(0));
    }

    function getStartEndUnix() {
        return [startRangeUnix.value, endRangeUnix.value];
    }

    return { setStartEndDates, getStartEndUnix }
})
