import { computed, ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import type { ServerSnapshot } from '@/ts/types/serversnapshot';
import { API_URL } from '@/constants';

import { useDates } from './dates';
const { setStartEndUnix, getStartEndUnix } = useDates()

import { useChangeKey } from './changekey';
const { getCurrentKey } = useChangeKey()

import { useTimings } from './debug/timings';
import { SnapshotSearcher } from '@/ts/snapshots/snapshotsearcher';
const { startTiming, endTiming } = useTimings()

const noTimeKeys = ["players_on", "players_max", "ping", "players_sample", "version_protocol", "version_name", "motd"];
const mapKeys = ["save_time", ...noTimeKeys];

export const useSnapshots = defineStore('snapshots', () => {
    const snapshots: Ref<ServerSnapshot[]> = ref([]);
    let snapshotSearcher: SnapshotSearcher | undefined = undefined;

    const latestSnapshot = computed(() => {
        startTiming("grabLatestSnapshotData");

        const snapshots = getServerSnapshots();
        if (snapshots == undefined || snapshots.length == 0) {
            endTiming("grabLatestSnapshotData", 0, "skipped");
            return {save_time: 0};
        }

        const latestServer = snapshotSearcher!.grabLatestSnapshotData(snapshots[snapshots.length - 1].save_time);
        
        endTiming("grabLatestSnapshotData", 0, "v2")
        return latestServer;
    })
    
    const firstSnapshotRebuild: Ref<ServerSnapshot> = ref() as Ref<ServerSnapshot>;
    const lastSnapshotPadding: Ref<ServerSnapshot> = ref() as Ref<ServerSnapshot>;

    const snapshotsDate: Ref<ServerSnapshot[]> = computed(() => {
        startTiming("grabSnapshotsDateRange");

        if (getServerSnapshots().length == 0) {
            endTiming("grabSnapshotsDateRange", 0, "Skipped");
            return [];
        }
        
        const range = getStartEndUnix();
        const snapshots = getServerSnapshots();
        const firstSnapshot = snapshots[0];
        const lastSnapshot = snapshots[snapshots.length - 1];
        if (range[0] == 0 || (range[0] == firstSnapshot.save_time && range[1] == lastSnapshot.save_time)) {
            firstSnapshotRebuild.value = firstSnapshot;
            lastSnapshotPadding.value = lastSnapshot;
            endTiming("grabSnapshotsDateRange", 0, "Skipped");
            return getServerSnapshots();
        }

        const dateRange = snapshotSearcher!.grabDateRangeIndex(range[0], range[1]);
        const newSnapshotDateList = getServerSnapshots().slice(dateRange[0], dateRange[1] + 1)

        // present in the shown graph. It's just there to make the graph render corretly if ending w a gap.
        // -1 to not conflict w actual existing values (= add a padding element at the start before all, don't override the first value)
        firstSnapshotRebuild.value = snapshotSearcher!.grabLatestSnapshotData(range[0]-1);
        lastSnapshotPadding.value = {
            save_time: range[1],
        };

        endTiming("grabSnapshotsDateRange", 0, "v2");
        return newSnapshotDateList;
    })

    const snapshotsDateCategory: Ref<ServerSnapshot[] | number[]> = computed(() => {       
        if (getServerSnapshotsForDateRange().length == 0)
            return [];

        startTiming("grabSnapshotsDateCategory");

        if (getCurrentKey() == "all") {
            endTiming("grabSnapshotsDateCategory", 0, "Skipped, ServerSnapshot");
            return getServerSnapshotsForDateRange();
        }
        
        // PROBLEM WITH SNAPSHOTSEARCHER APPROACH:
        // I only have the indexes of the elements inside of the sublist, not the main list.
        // Will work on improving that in the next commit 

        const range = getStartEndUnix();
        const newList = snapshotSearcher!.grabSnapshotDateCategory(range[0], range[1], getCurrentKey());

        endTiming("grabSnapshotsDateCategory", 0, "number");
        return newList;
    })

    async function requestServerSnapshots(ip: string) {
        startTiming("request");
        const rawData: any[][] = await fetch(`${API_URL}/get_all_server_data/${ip}`)
            .then(data => data.json());
        endTiming("request")

        startTiming("parsing");
        let _snapshots = rawData.map(sublist => {
            return Object.fromEntries(mapKeys.map((key, index) => [key, sublist[index]]));
        }) as ServerSnapshot[];
        setStartEndUnix(_snapshots[0].save_time, _snapshots[_snapshots.length - 1].save_time);
        endTiming("parsing");

        startTiming("initSearch");
        snapshotSearcher = new SnapshotSearcher(_snapshots);
        endTiming("initSearch");

        snapshots.value = _snapshots;
    }

    function getServerSnapshots() {
        return snapshots.value;
    }

    function getServerSnapshotsForDateRange() {
        return snapshotsDate.value;
    }
    function getServerSnapshotsForDateRangePaddings() {
        return [firstSnapshotRebuild.value, ...snapshotsDate.value, lastSnapshotPadding.value];
    }
    function getServerSnapshotsForDateRangeAndCategory() {
        return snapshotsDateCategory.value;
    }

    function getLatestServerSnapshotFull() {
        return latestSnapshot.value;
    }

    function reset() {
        snapshots.value = [];
        // @ts-ignore
        firstSnapshotRebuild.value = undefined; lastSnapshotPadding.value = undefined;
    }

    return { requestServerSnapshots, getServerSnapshots, getServerSnapshotsForDateRange, getLatestServerSnapshotFull, getServerSnapshotsForDateRangeAndCategory, getServerSnapshotsForDateRangePaddings, reset }
})
