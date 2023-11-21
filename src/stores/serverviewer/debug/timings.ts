import { ref } from 'vue'
import { defineStore } from 'pinia'

// export interface Timings {
//     request?: number,
//     parsing?: number,
//     show?: number,
//     [key: string]: number | undefined
// }

// For now using this to keep the order right,
// otherwise it doesn't seem to be ordered.
export const keyOrder = ["request", "parsing", "grabLatestSnapshotData", "grabSnapshotsDateRange", "recalculateGraph", "graphDisplay"]

export const useTimings = defineStore('timings', () => {
    const _isShown = ref(false);
    // const timings: Ref<Timings> = ref({} as Timings);
    const startTimings = {} as {[key: string]: number};
    const timings = ref({} as {[key: string]: number})

    function setShown(shown: boolean) {
        _isShown.value = shown;
    }
    function isShown() {
        return _isShown.value;
    }

    function startTiming(key: string)  {
        startTimings[key] = Date.now();
    }
    // See PlayercountGraph as to why "offset" is here
    function endTiming(key: string, offset?: number) {
        if (offset == undefined) 
            offset = 0
        timings.value[key] = Date.now() - offset - startTimings[key];
    }
    function endStartTiming(endKey: string, startKey: string) {
        endTiming(endKey);
        startTiming(startKey);
    }

    function getTiming(key: string) {
        return timings.value[key];
    }
    function getAllTimings() {
        return Object.entries(timings.value);
    }
    function reset() {
        timings.value = {};
    }

    return { setShown, isShown, startTiming, endTiming, endStartTiming, getTiming, getAllTimings, reset }
})
