import { computed, ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import type { ServerSnapshot } from '@/ts/types/serversnapshot';
import { API_URL } from '@/constants';

import { useDates } from './dates';
const { setStartEndDates, getStartEndUnix } = useDates()

import { useChangeKey } from './changekey';
const { getCurrentKey } = useChangeKey()

const keys = ["save_time", "players_on", "players_max", "ping", "players_sample", "version_protocol", "version_name", "motd"]

export const fullKeys = [...keys, "save_date"];

export const useSnapshots = defineStore('snapshots', () => {
    const snapshots: Ref<ServerSnapshot[]> = ref([]);
    
    // A bit laggy but good enough
    const snapshotsDate: Ref<ServerSnapshot[]> = computed(() => {
        if (getServerSnapshots().length == 0)
            return [];
        const range = getStartEndUnix();
        if (range[0] == 0)
            return getServerSnapshots();
            
        const newSnapshotDateList = [];
        for (const snapshot of getServerSnapshots()) {
            if (snapshot.save_time > range[0] && snapshot.save_time < range[1])
                newSnapshotDateList.push(snapshot);
        }
        return newSnapshotDateList;
    })

    const snapshotsDateCategory: Ref<ServerSnapshot[]> = computed(() => {
        if (getServerSnapshotsForDateRange().length == 0)
            return [];
        if (getCurrentKey() == "All")
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

    async function requestServerSnapshots(ip: string, refSpan: Ref<HTMLSpanElement>) {
        refSpan.value.textContent = "Loading content..."

        const rawData: any[][] = await fetch(`${API_URL}/get_all_server_data/${ip}`)
            .then(data => data.json());
        
        refSpan.value.textContent = "Request done, parsing content..."

        snapshots.value = rawData.map(sublist => {
            return Object.fromEntries(keys.map((key, index) => [key, sublist[index]]));
        }) as ServerSnapshot[];
        
        snapshots.value.forEach(snapshot => {
            snapshot.save_date = new Date(snapshot.save_time * 1000);
        })        
        setStartEndDates(snapshots.value[0].save_date, snapshots.value[snapshots.value.length - 1].save_date);
        refSpan.value.textContent = "Loaded & parsed content successfully. "
    }

    function getServerSnapshots() {
        return snapshots.value;
    }

    function getServerSnapshotsForDateRange() {
        return snapshotsDate.value;
    }
    function getServerSnapshotsForDateRangeAndCategory() {
        return snapshotsDateCategory.value;
    }

    // Ow typescript
    function getLatestServerSnapshotFull() {
        const latestServer = {} as any;
        const remainingKeys = [...fullKeys];
        
        for (const snapshot of [...getServerSnapshots()].reverse() as any[]) {            
            for (const key of remainingKeys) {
                if (snapshot[key]) {
                    latestServer[key] = snapshot[key]
                    remainingKeys.splice(remainingKeys.indexOf(key), 1)                    
                }
            } 
            if (remainingKeys.length == 0)
                break;
        }
        return latestServer as ServerSnapshot;
    }

    function reset() {
        snapshots.value = [];
    }

    return { requestServerSnapshots, getServerSnapshots, getServerSnapshotsForDateRange, getLatestServerSnapshotFull, getServerSnapshotsForDateRangeAndCategory, reset }
})
