import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'

export interface Timing {
    start_time: number,
    time?: number | string,
    comment?: string,
    [key: string]: number | string | undefined
}

// For now using this to keep the order right,
// otherwise it doesn't seem to be ordered.
export const keyOrder = ["request", "parsing", "grabLatestSnapshotData", "grabSnapshotsDateRange", "recalculateGraph", "graphDisplay"]

export const useTimings = defineStore('timings', () => {
    // TODO: MOVE SHOWN ELSEWHERE
    const _isShown = ref(false);
    const timings: Ref<Map<string, Timing>> = ref(new Map());

    function setShown(shown: boolean) {
        _isShown.value = shown;
    }
    function isShown() {
        return _isShown.value;
    }

    function startTiming(key: string) {
        timings.value.set(key, {start_time: Date.now()});
    }
    // See PlayercountGraph as to why "offset" is here
    function endTiming(key: string, offset?: number, comment?: string) {
        if (offset == undefined) 
            offset = 0
        const currentTiming = timings.value.get(key);
        if (currentTiming == undefined)
            return;

        currentTiming.time = Date.now() - offset - currentTiming.start_time;
        if (comment) 
            currentTiming.comment = comment;
    }
    function endStartTiming(endKey: string, startKey: string) {
        endTiming(endKey);
        startTiming(startKey);
    }

    function getTiming(key: string) {
        const timing = timings.value.get(key);
        if (timing == undefined)
            return {start_time: 0, time: "X"} as Timing
        return timing;
    }
    function getAllTimings() {
        // Note: Javascript object aren't guaranteed to be in order,
        // but in modern browsers they most likely are, hence why not bothering much w this.
        const orderedTimings: { [key: string]: Timing } = {};
        keyOrder.forEach(key => {
            const timing = timings.value.get(key);
            if (timing)
                orderedTimings[key] = timing;
        });
        return orderedTimings;
    }
    function reset() {
        timings.value.clear();
    }

    return { setShown, isShown, startTiming, endTiming, endStartTiming, getTiming, getAllTimings, reset }
})
