import { computed, ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import type { ServerSnapshot } from '@/ts/types/serversnapshot';
import { API_URL } from '@/constants';

import { useDates } from './dates';
const { setStartEndDates, getStartEndUnix, getStartEndDate } = useDates()

import { useChangeKey } from './changekey';
const { getCurrentKey } = useChangeKey()

import { useTimings } from './debug/timings';
const { startTiming, endTiming, endStartTiming } = useTimings()

const noTimeKeys = ["players_on", "players_max", "ping", "players_sample", "version_protocol", "version_name", "motd"];
const mapKeys = ["save_time", ...noTimeKeys];
const fullKeys = [...mapKeys, "save_date"];

export const useSnapshots = defineStore('snapshots', () => {
    const snapshots: Ref<ServerSnapshot[]> = ref([]);

    const latestSnapshot = computed(() => {
        startTiming("grabLatestSnapshotData");
        const latestServer: { [key: string]: any } = {};
        const remainingKeys = [...fullKeys];

        // Note: For some reason I cannot possibly explain,
        // this does NOT grab the version_name, even tho it's technically
        // in snapshots.value. I don't know how to fix it, adding random garbage at the start
        // seems to make it show up, but that's not really a "fix".
        // Really looks like a Vue bug.
        for (const snapshot of [...getServerSnapshots()].reverse()) {
            for (const key of remainingKeys) {
                if (snapshot[key]) {
                    latestServer[key] = snapshot[key]
                    remainingKeys.splice(remainingKeys.indexOf(key), 1)
                }
            } 
            if (remainingKeys.length == 0)
                break;
        }        
        endTiming("grabLatestSnapshotData")
        return latestServer as ServerSnapshot;
    })
    
    const firstSnapshotRebuild: Ref<ServerSnapshot> = ref() as Ref<ServerSnapshot>;
    const lastSnapshotPadding: Ref<ServerSnapshot> = ref() as Ref<ServerSnapshot>;
    // A bit laggy but good enough
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
            
        const rangeDate = getStartEndDate();
        
        // present in the shown graph. It's just there to make the graph render corretly if ending w a gap.
        const _firstSnapshotRebuild: ServerSnapshot = {
            save_time: range[0],
            save_date: rangeDate[0]
        };
        const newSnapshotDateList = [];
        for (const snapshot of getServerSnapshots()) {
            // First, if not yet at bottom of range, save data 
            // to reconstruct the data of the first snapshot
            if (snapshot.save_time <= range[0]) {
                noTimeKeys.forEach((key) => {
                    if (snapshot[key] != null) _firstSnapshotRebuild[key] = snapshot[key];
                })
                continue
            };
            // Next, if above the top of the range, we know we're done, so break
            if (snapshot.save_time >= range[1]) 
                break;
            // Otherwise just add it normally
            newSnapshotDateList.push(snapshot);
        }
        // Assign refs at the end to avoid too many unneccesary changes.
        firstSnapshotRebuild.value = _firstSnapshotRebuild;
        lastSnapshotPadding.value = {
            save_time: range[1],
            save_date: rangeDate[1]
        };

        endTiming("grabSnapshotsDateRange");
        return newSnapshotDateList;
    })

    const snapshotsDateCategory: Ref<ServerSnapshot[]> = computed(() => {
        if (getServerSnapshotsForDateRange().length == 0)
            return [];
        if (getCurrentKey() == "all")
            return getServerSnapshotsForDateRange();

        const newList: ServerSnapshot[] = [];
        for (const snapshot of getServerSnapshotsForDateRange()) {
            // @ts-ignore
            const snapshotElement = snapshot[getCurrentKey()];
            if (snapshotElement != undefined && snapshotElement != null) { // just in case
                newList.push(snapshotElement);
            }
        }
        return newList;
    })

    async function requestServerSnapshots(ip: string) {
        startTiming("request");

        const rawData: any[][] = await fetch(`${API_URL}/get_all_server_data/${ip}`)
            .then(data => data.json());
        
        endStartTiming("request", "parsing");

        let _snapshots = rawData.map(sublist => {
            return Object.fromEntries(mapKeys.map((key, index) => [key, sublist[index]]));
        }) as ServerSnapshot[];

        _snapshots.forEach(snapshot => {
            snapshot.save_date = new Date(snapshot.save_time * 1000);
        })
        setStartEndDates(_snapshots[0].save_date, _snapshots[_snapshots.length - 1].save_date);
        
        snapshots.value = _snapshots;
        endTiming("parsing");
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
