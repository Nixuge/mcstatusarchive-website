import { ref, type ComputedRef, type Ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { API_URL } from '@/constants';
import { useSearcher } from './searcher';


export interface Server {
    ip: string;
    motd: string;
    motd_text?: string; // To be set from ServerEntry from textContent
    favicon: string;
    ping: number;
    players_max: number;
    players_on: number;
    save_time: number;
    version_name: string;
    version_protocol: number;
}

export const useServerList = defineStore('serverList', () => {
    const serverList: Ref<Server[]> = ref([]);

    const selectedServer = ref("");

    async function requestServerList() {
        const data = await fetch(API_URL + "/get_latest_servers_data")
            .then(response => response.json());
        
        // Format {ip1: {...}, ip2: {....}}
        // to [{ip: ip1, ...}, {ip: ip2, ...}]

        serverList.value = Object.keys(data).map(ip => ({
            ip: ip,
            ...data[ip]
          }));
          
    }
    
    const { getSearchText, getMaxPing, getMinPlayerCount, getOrder, getOrderDescending } = useSearcher();
    const shownServerList: ComputedRef<Server[]> = computed(() => {
        const allShown = [];
        const minPlayers = getMinPlayerCount();
        const maxPing = getMaxPing();
        for (const server of serverList.value) {
            const search = getSearchText();
            if ((server.ip.toLowerCase().includes(search) || server.motd_text && server.motd_text.toLowerCase().includes(search)) &&
            (!minPlayers || server.players_on > minPlayers) && (!maxPing || server.ping < maxPing)
            ) {
                allShown.push(server);
            }
        }
        return allShown;
    });

    const shownServerListOrdered: ComputedRef<Server[]> = computed(() => {
        const servers = [...shownServerList.value];
        const order = getOrder();
        console.log(order);
        
        switch (order) {
            case "alphabetical":
                servers.sort(function (a, b) {return a.ip.toLowerCase().localeCompare(b.ip.toLowerCase());});
                break;
            case "ping":
                servers.sort((a, b) => a.ping - b.ping);
                break;
            case "playercount":
                servers.sort((a, b) => a.players_on - b.players_on);
                break;
            default:
                break;
        }
        if (getOrderDescending())
            servers.reverse()
        return servers;
    });

    function getShownServerList() {
        return shownServerListOrdered.value; // assume we always want the ordered list anyways
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
