import { computed, ref, shallowRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import type { ServerDataResponse, ServerSnapshot } from '@/ts/types/serversnapshot';
import { API_URL } from '@/constants';

import { useDates } from './dates';
const { setStartEndUnix, getStartEndUnix } = useDates()

import { useChangeKey } from './changekey';
const { getCurrentKey } = useChangeKey()

import { useTimings } from './debug/timings';
import { SnapshotSearcher } from '@/ts/snapshots/snapshotsearcher';
const { startTiming, endTiming } = useTimings()

export const useSnapshots = defineStore('snapshots', () => {
    const rawDataResponse: Ref<ServerDataResponse | null> = ref(null);
    const snapshotSearcher: Ref<SnapshotSearcher | undefined> = shallowRef(undefined);

    const latestSnapshot = computed(() => {
        startTiming("grabLatestSnapshotData");

        if (!snapshotSearcher.value || !rawDataResponse.value) {
            endTiming("grabLatestSnapshotData", 0, "skipped");
            return { save_time: 0 } as ServerSnapshot;
        }

        const heartbeats = snapshotSearcher.value.getHeartbeats();
        if (heartbeats.length === 0) {
            endTiming("grabLatestSnapshotData", 0, "skipped");
            return { save_time: 0 } as ServerSnapshot;
        }

        const latestTime = heartbeats[heartbeats.length - 1];
        const latestServer = snapshotSearcher.value.grabLatestSnapshotData(latestTime);
        
        endTiming("grabLatestSnapshotData", 0, "native_v2")
        return latestServer;
    })
    
    const firstSnapshotRebuild: Ref<ServerSnapshot> = ref() as Ref<ServerSnapshot>;
    const lastSnapshotPadding: Ref<ServerSnapshot> = ref() as Ref<ServerSnapshot>;

    const snapshotsDate: Ref<number[]> = computed(() => {
        startTiming("grabSnapshotsDateRange");

        if (!snapshotSearcher.value || !rawDataResponse.value) {
            endTiming("grabSnapshotsDateRange", 0, "Skipped");
            return [];
        }
        
        const heartbeats = snapshotSearcher.value.getHeartbeats();
        if (heartbeats.length === 0) {
            endTiming("grabSnapshotsDateRange", 0, "Skipped");
            return [];
        }

        const range = getStartEndUnix();
        const firstHeartbeat = heartbeats[0];
        const lastHeartbeat = heartbeats[heartbeats.length - 1];

        if (range[0] === 0 || (range[0] <= firstHeartbeat && range[1] >= lastHeartbeat)) {
            firstSnapshotRebuild.value = snapshotSearcher.value.grabLatestSnapshotData(firstHeartbeat);
            lastSnapshotPadding.value = snapshotSearcher.value.grabLatestSnapshotData(lastHeartbeat);
            endTiming("grabSnapshotsDateRange", 0, "Skipped");
            return heartbeats;
        }

        const dateRange = snapshotSearcher.value.grabDateRangeIndex(range[0], range[1]);
        const newSnapshotDateList = heartbeats.slice(dateRange[0], dateRange[1] + 1);

        firstSnapshotRebuild.value = snapshotSearcher.value.grabLatestSnapshotData(range[0] - 1);
        lastSnapshotPadding.value = {
            save_time: range[1],
        } as ServerSnapshot;

        endTiming("grabSnapshotsDateRange", 0, "native_v2");
        return newSnapshotDateList;
    })

    const snapshotsDateCategory: Ref<number[] | ServerSnapshot[]> = computed(() => {       
        if (getServerSnapshotsForDateRange().length === 0 || !snapshotSearcher.value)
            return [];

        startTiming("grabSnapshotsDateCategory");

        const range = getStartEndUnix();
        const categoryKey = getCurrentKey();

        if (categoryKey === "all") {
            endTiming("grabSnapshotsDateCategory", 0, "Skipped");
            return getServerSnapshotsForDateRange();
        }

        const categoryTimestamps = snapshotSearcher.value.grabSnapshotDateCategory(range[0], range[1], categoryKey);
        endTiming("grabSnapshotsDateCategory", 0, "NativeCategory");

        return categoryTimestamps;
    })

    async function requestServerSnapshots(ip: string) {
        startTiming("request");
        const data: ServerDataResponse = await fetch(`${API_URL}/get_all_server_data/${ip}`)
            .then(res => res.json());
        endTiming("request")

        startTiming("parsing");
        rawDataResponse.value = data;
        snapshotSearcher.value = new SnapshotSearcher(data);
        
        const heartbeats = data.heartbeats || [];
        if (heartbeats.length > 0) {
            setStartEndUnix(heartbeats[0], heartbeats[heartbeats.length - 1]);
        }
        endTiming("parsing");

        startTiming("initSearch");
        endTiming("initSearch");
    }

    const allHeartbeats = computed(() => {
        return snapshotSearcher.value ? snapshotSearcher.value.getHeartbeats() : [];
    });

    function getServerSnapshots() {
        return allHeartbeats.value;
    }

    function getServerSnapshotsForDateRange() {
        return snapshotsDate.value;
    }

    function getServerSnapshotsForDateRangePaddings() {
        return [firstSnapshotRebuild.value, ...snapshotsDate.value.map(ts => ({ save_time: ts })), lastSnapshotPadding.value];
    }

    function getServerSnapshotsForDateRangeAndCategory() {
        return snapshotsDateCategory.value;
    }

    function getLatestServerSnapshotFull() {
        return latestSnapshot.value;
    }

    function getSnapshotSearcher() {
        return snapshotSearcher.value;
    }

    function reset() {
        rawDataResponse.value = null;
        snapshotSearcher.value = undefined;
        // @ts-ignore
        firstSnapshotRebuild.value = undefined; lastSnapshotPadding.value = undefined;
    }

    return { 
        requestServerSnapshots, 
        getServerSnapshots, 
        getServerSnapshotsForDateRange, 
        getLatestServerSnapshotFull, 
        getServerSnapshotsForDateRangeAndCategory, 
        getServerSnapshotsForDateRangePaddings,
        getSnapshotSearcher,
        reset 
    }
})
