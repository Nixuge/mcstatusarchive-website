import { ref, type ComputedRef, type Ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { API_URL, SERVER_IP_BLACKLIST } from '@/constants';
import { useSearcher } from './searcher';



export interface Server {
    name?: string;
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
    players_sample?: string;
    version_brand?: string;
    gamemode?: string;
    map?: string;
    type?: number; // 0 = java, 1 = bedrock
    enforces_secure_chat?: number;
    forge_fml_network_version?: number;
    forge_truncated?: number;
    forge_channels?: string;
    forge_mods?: string;
}

export const useServerList = defineStore('serverList', () => {
    const serverList: Ref<Server[]> = ref([]);

    const selectedServer = ref("");

    async function requestServerList() {
        const data = await fetch(API_URL + "/get_latest_servers_data")
            .then(response => response.json());
        
        // Format {ip1: {...}, ip2: {....}}
        // to [{ip: ip1, ...}, {ip: ip2, ...}]

        serverList.value = Object.keys(data)
            .filter(ip => !SERVER_IP_BLACKLIST.some(b => b.toLowerCase() === ip.toLowerCase()))
            .map(ip => ({
                ip: ip,
                ...data[ip]
            }));

          
    }
    
    const { getSearchText, getMaxPing, getMinPlayerCount, getOrder, getOrderDescending, getServerType, getModdedFilter } = useSearcher();
    const shownServerList: ComputedRef<Server[]> = computed(() => {
        const allShown = [];
        const minPlayers = getMinPlayerCount();
        const maxPing = getMaxPing();
        const search = getSearchText();
        const typeFilter = getServerType();
        const moddedFilter = getModdedFilter();

        for (const server of serverList.value) {
            const motdCombined = (server.motd || "") + " " + (server.motd_text || "");
            const matchesSearch = !search || server.ip.toLowerCase().includes(search) || motdCombined.toLowerCase().includes(search);
            const matchesPlayers = !minPlayers || (server.players_on && server.players_on > minPlayers);
            const matchesPing = !maxPing || (server.ping && server.ping < maxPing);

            let matchesType = true;
            if (typeFilter === "java") {
                matchesType = server.type === 0 || server.type === undefined;
            } else if (typeFilter === "bedrock") {
                matchesType = server.type === 1;
            }

            let matchesModded = true;
            const isForgeServer = server.forge_fml_network_version !== undefined && 
                                  server.forge_fml_network_version !== null && 
                                  server.forge_fml_network_version !== -1;
            if (moddedFilter === "vanilla") {
                matchesModded = !isForgeServer;
            } else if (moddedFilter === "forge") {
                matchesModded = isForgeServer;
            }

            if (matchesSearch && matchesPlayers && matchesPing && matchesType && matchesModded) {
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
