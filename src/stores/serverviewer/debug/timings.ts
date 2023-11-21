import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'

// export interface Timings {
//     request?: number,
//     parsing?: number,
//     show?: number,
//     [key: string]: number | undefined
// }

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
    function endTiming(key: string) {
        timings.value[key] = Date.now() - startTimings[key];
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

    return { setShown, isShown, startTiming, endTiming, endStartTiming, getTiming, getAllTimings }
})
