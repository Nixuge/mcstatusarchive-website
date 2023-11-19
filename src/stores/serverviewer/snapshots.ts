import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import type { ServerSnapshot } from '@/ts/types/serversnapshot';
import { API_URL } from '@/constants';

const keys = ["save_time", "players_on", "players_max", "ping", "players_sample", "version_protocol", "version_name", "motd"]

export const useSnapshots = defineStore('snapshots', () => {
    const snapshots: Ref<ServerSnapshot[]> = ref([])

    async function requestServerSnapshots(ip: string) {
        const rawData: any[][] = await fetch(`${API_URL}/get_all_server_data/${ip}`)
            .then(data => data.json());
        
        snapshots.value = rawData.map(sublist => {
        return Object.fromEntries(keys.map((key, index) => [key, sublist[index]]));
        }) as ServerSnapshot[];
    }

    function getServerSnapshots() {
        return snapshots.value;
    }

    return { requestServerSnapshots, getServerSnapshots }
})
