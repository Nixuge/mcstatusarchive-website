import { computed, ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { API_URL } from '@/constants';
import { useSearcher } from './searcher';


export interface Server {
    ip: string;
    motd: string;
    favicon: string;
    ping: number;
    players_max: number;
    players_on: number;
    save_time: number;
    version_name: string;
    version_protocol: number;
}

export const useServerList = defineStore('serverList', () => {
    const serverList: Ref<Server[]> = ref([])

    const selectedServer = ref("")

    async function requestServerList() {
        const data = await fetch(API_URL + "/get_latest_servers_data")
            .then(response => response.json())
        
        // Format {ip1: {...}, ip2: {....}}
        // to [{ip: ip1, ...}, {ip: ip2, ...}]

        serverList.value = Object.keys(data).map(ip => ({
            ip: ip,
            ...data[ip]
          }));
          
    }
    
    const { getSearchText } = useSearcher();
    function getShownServerList() {
        const allShown = []
        for (const server of serverList.value) {
            if (server.ip.toLowerCase().includes(getSearchText())) {
                allShown.push(server);
            }
        }
        console.log(allShown);

        return allShown;
    }

    function getServerList() {
        return serverList.value;
    }

    function changeSelectedServer(newSelectedServer: string) {
        selectedServer.value = newSelectedServer;
    }

    function getSelectedServer() {
        return selectedServer.value;
    }

    return { requestServerList, getServerList, getShownServerList, changeSelectedServer, getSelectedServer }
})