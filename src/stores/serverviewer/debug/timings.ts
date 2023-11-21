import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'

// export interface Timings {
//     request?: number,
//     parsing?: number,
//     show?: number,
//     [key: string]: number | undefined
// }

export const timingKeys = ["request", "parsing", "display"];

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
        // todo: add "includes" here
        return timings.value[key];
    }

    return { setShown, isShown, startTiming, endTiming, endStartTiming, getTiming }
})
