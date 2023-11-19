import { computed, ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import type { ServerSnapshot } from '@/ts/types/serversnapshot';
import { API_URL } from '@/constants';
import { useDates } from './dates';

const { setStartEndDates, getStartEndUnix } = useDates()

const keys = ["save_time", "players_on", "players_max", "ping", "players_sample", "version_protocol", "version_name", "motd"]

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

    async function requestServerSnapshots(ip: string) {
        const rawData: any[][] = await fetch(`${API_URL}/get_all_server_data/${ip}`)
            .then(data => data.json());
        
        snapshots.value = rawData.map(sublist => {
            return Object.fromEntries(keys.map((key, index) => [key, sublist[index]]));
        }) as ServerSnapshot[];
        
        snapshots.value.forEach(snapshot => {
            snapshot.save_date = new Date(snapshot.save_time * 1000);
        })
        setStartEndDates(snapshots.value[0].save_date, snapshots.value[snapshots.value.length - 1].save_date);
    }

    function getServerSnapshots() {
        return snapshots.value;
    }

    function getServerSnapshotsForDateRange() {
        return snapshotsDate.value;
    }

    return { requestServerSnapshots, getServerSnapshots, getServerSnapshotsForDateRange }
})
