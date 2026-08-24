import { defineStore } from 'pinia';
import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { API_URL, SERVER_IP_BLACKLIST } from '@/constants';
import type { Server } from './serverlist';

export function isBlacklisted(ip: string): boolean {
    if (!ip || SERVER_IP_BLACKLIST.length === 0) return false;
    const lower = ip.toLowerCase();
    return SERVER_IP_BLACKLIST.some(b => b.toLowerCase() === lower);
}


export interface ServerPlayerHistory {
    id: number;
    table_name: string;
    name?: string;
    ip: string;
    port: number;
    type: number;
    heartbeats: number[];
    players_on: [number, number][]; // [timestamp, value]
}

export type TimeRange = '1d' | '7d' | '30d' | 'max';

// Golden ratio HSL color generator for up to 500 distinct colors
export function getDeterministicColor(index: number): string {
    const hue = Math.round((index * 137.507764) % 360);
    const sat = 80 + (index % 3) * 8;
    const light = 55 + (index % 4) * 4;
    return `hsl(${hue}, ${sat}%, ${light}%)`;
}

export function hslToRgba(hslStr: string, alpha: number): string {
    const match = hslStr.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) return `rgba(252, 152, 2, ${alpha})`;
    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;

    let r: number, g: number, b: number;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
}

export function binarySearchClosest(arr: number[] | undefined, val: number): number {
    if (!arr || arr.length === 0) return -1;
    const max = arr.length - 1;
    if (val >= arr[max]) return max;
    if (val < arr[0]) return -1;

    let start = 0;
    let end = max;

    while (start <= end) {
        const mid = Math.floor((start + end) / 2);
        if (arr[mid] === val) return mid;
        if (val > arr[mid]) {
            if (mid < max && arr[mid + 1] > val) {
                return mid;
            }
            start = mid + 1;
        } else {
            end = mid - 1;
        }
    }
    return 0;
}

export const useGraphStore = defineStore('graph', () => {
    const serverList: Ref<Server[]> = ref([]);
    const selectedServerIps: Ref<string[]> = ref([]);
    const historyCache = ref<Record<string, ServerPlayerHistory>>({});
    const isLoading = ref<boolean>(false);

    // Filters and settings
    const timeRange: Ref<TimeRange> = ref('1d');
    const searchFilter: Ref<string> = ref('');
    const isRegexEnabled: Ref<boolean> = ref(false);
    const isFillEnabled: Ref<boolean> = ref(true);

    function toggleFill() {
        isFillEnabled.value = !isFillEnabled.value;
    }


    // Mapping from server IP to color
    const serverColors: ComputedRef<Record<string, string>> = computed(() => {
        const map: Record<string, string> = {};
        selectedServerIps.value.forEach((ip, idx) => {
            map[ip] = getDeterministicColor(idx);
        });
        return map;
    });

    const isInitialized = ref(false);

    async function initGraph(initialQuery?: { servers?: string; range?: string }) {
        isLoading.value = true;
        try {
            const data = await fetch(`${API_URL}/get_latest_servers_data`).then(r => r.json());
            const list: Server[] = Object.keys(data)
                .filter(ip => !isBlacklisted(ip))
                .map(ip => ({
                    ip: ip,
                    ...data[ip]
                }));

            // Sort by current players_on descending
            list.sort((a, b) => (b.players_on || 0) - (a.players_on || 0));
            serverList.value = list;

            // Check if initial query has servers specified
            if (initialQuery && initialQuery.servers) {
                const requested = initialQuery.servers
                    .split(',')
                    .map(s => s.trim())
                    .filter(ip => ip && !isBlacklisted(ip))
                    .slice(0, 500);
                if (requested.length > 0) {
                    selectedServerIps.value = requested;
                }
            }

            if (initialQuery && initialQuery.range && ['1d', '7d', '30d', 'max'].includes(initialQuery.range)) {
                timeRange.value = initialQuery.range as TimeRange;
            }

            // Default select top 15 servers if none selected
            if (selectedServerIps.value.length === 0) {
                const top15 = list.slice(0, 15).map(s => s.ip);
                selectedServerIps.value = top15;
            }

            await fetchHistoryForServers(selectedServerIps.value);
            isInitialized.value = true;
        } catch (err) {
            console.error('Failed to init graph:', err);
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchHistoryForServers(ips: string[]) {
        const missing = ips.filter(ip => !historyCache.value[ip] && !isBlacklisted(ip));
        if (missing.length === 0) return;

        isLoading.value = true;
        try {
            for (let i = 0; i < missing.length; i += 100) {
                const chunk = missing.slice(i, i + 100);
                const response = await fetch(`${API_URL}/get_multi_server_playercount_data`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ servers: chunk })
                }).then(r => r.json());

                for (const [key, data] of Object.entries(response)) {
                    historyCache.value[key] = data as ServerPlayerHistory;
                }
            }
        } catch (err) {
            console.error('Failed to fetch multi-server player history:', err);
        } finally {
            isLoading.value = false;
        }
    }

    function toggleServer(ip: string) {
        if (isBlacklisted(ip)) return false;
        const idx = selectedServerIps.value.indexOf(ip);
        if (idx >= 0) {
            selectedServerIps.value.splice(idx, 1);
        } else {
            if (selectedServerIps.value.length >= 500) {
                return false;
            }
            selectedServerIps.value.push(ip);
            fetchHistoryForServers([ip]);
        }
        return true;
    }


    function selectTopGlobal(count: number) {
        const valid = serverList.value.slice(0, Math.min(count, 500)).map(s => s.ip);
        selectedServerIps.value = valid;
        fetchHistoryForServers(valid);
    }

    function selectTop(count: number) {
        const list = searchFilter.value.trim() ? filteredServers.value : serverList.value;
        const valid = list.slice(0, Math.min(count, 500)).map(s => s.ip);
        selectedServerIps.value = valid;
        fetchHistoryForServers(valid);
    }

    function clearAllSelected() {
        selectedServerIps.value = [];
    }

    function setTimeRange(range: TimeRange) {
        timeRange.value = range;
    }

    function setSearchFilter(s: string) {
        searchFilter.value = s;
    }

    function toggleRegex() {
        isRegexEnabled.value = !isRegexEnabled.value;
    }

    function buildSearchRegex(pattern: string): RegExp | null {
        if (!pattern) return null;
        try {
            return new RegExp(pattern, 'i');
        } catch {
            try {
                // If it failed (e.g. leading * like *b or glob syntax), sanitize it
                let fixed = pattern;
                if (fixed.startsWith('*')) {
                    fixed = '.*' + fixed.slice(1);
                } else if (fixed.startsWith('+')) {
                    fixed = '.+' + fixed.slice(1);
                } else if (fixed.startsWith('?')) {
                    fixed = '.?' + fixed.slice(1);
                }
                return new RegExp(fixed, 'i');
            } catch {
                return null;
            }
        }
    }

    // Filtered list of servers based on search and regex mode
    const filteredServers: ComputedRef<Server[]> = computed(() => {
        const rawSearch = searchFilter.value.trim();
        if (!rawSearch) return serverList.value;

        let reg: RegExp | null = null;
        if (isRegexEnabled.value) {
            reg = buildSearchRegex(rawSearch);
        }

        const searchLower = rawSearch.toLowerCase();
        return serverList.value.filter(server => {
            const name = server.name || '';
            const ip = server.ip || '';
            const motd = server.motd || '';
            const ver = server.version_name || '';

            if (reg) {
                return reg.test(name) || reg.test(ip) || reg.test(motd) || reg.test(ver);
            }
            return name.toLowerCase().includes(searchLower) ||
                   ip.toLowerCase().includes(searchLower) ||
                   motd.toLowerCase().includes(searchLower) ||
                   ver.toLowerCase().includes(searchLower);
        });
    });


    // Compute range bounds [rangeStart, rangeEnd]
    const rangeBounds = computed(() => {
        const selected = selectedServerIps.value;
        let maxTs = 0;
        let minTs = Number.MAX_SAFE_INTEGER;

        for (const ip of selected) {
            const hist = historyCache.value[ip];
            if (!hist) continue;
            if (hist.heartbeats && hist.heartbeats.length > 0) {
                const first = hist.heartbeats[0];
                const last = hist.heartbeats[hist.heartbeats.length - 1];
                if (first < minTs) minTs = first;
                if (last > maxTs) maxTs = last;
            }
            if (hist.players_on && hist.players_on.length > 0) {
                const first = hist.players_on[0][0];
                const last = hist.players_on[hist.players_on.length - 1][0];
                if (first < minTs) minTs = first;
                if (last > maxTs) maxTs = last;
            }
        }

        if (maxTs === 0 || minTs === Number.MAX_SAFE_INTEGER) {
            maxTs = Math.floor(Date.now() / 1000);
            minTs = maxTs - 86400;
        }

        let rangeStart = minTs;
        const rangeEnd = maxTs;

        if (timeRange.value === '1d') {
            rangeStart = rangeEnd - 24 * 3600;
        } else if (timeRange.value === '7d') {
            rangeStart = rangeEnd - 7 * 24 * 3600;
        } else if (timeRange.value === '30d') {
            rangeStart = rangeEnd - 30 * 24 * 3600;
        } else {
            rangeStart = minTs;
        }

        return {
            startSec: rangeStart,
            endSec: rangeEnd,
            startMs: rangeStart * 1000,
            endMs: rangeEnd * 1000,
            minRecordedSec: minTs,
            maxRecordedSec: maxTs,
        };
    });

    // Build timeline data points for Chart.js
    const chartData = computed(() => {
        const selected = selectedServerIps.value;
        if (selected.length === 0) {
            return { labels: [], datasets: [] };
        }

        const bounds = rangeBounds.value;
        const rangeStart = bounds.startSec;
        const rangeEnd = bounds.endSec;
        const duration = rangeEnd - rangeStart;

        // Choose number of sampling bins (~200 to 400 points)
        let step = 300;
        if (duration <= 86400) {
            step = 300; // 5 min
        } else if (duration <= 7 * 86400) {
            step = 1200; // 20 min
        } else if (duration <= 30 * 86400) {
            step = 3600; // 1 hour
        } else {
            step = Math.max(3600, Math.floor(duration / 300));
        }

        const labels: number[] = [];
        for (let t = rangeStart; t <= rangeEnd; t += step) {
            labels.push(t * 1000);
        }
        if (labels.length > 0 && labels[labels.length - 1] < rangeEnd * 1000) {
            labels.push(rangeEnd * 1000);
        }

        // Build datasets for each selected server
        const datasets = selected.map((ip, idx) => {
            const hist = historyCache.value[ip];
            const serverInfo = serverList.value.find(s => s.ip === ip);
            const serverName = (hist && hist.name) || (serverInfo && serverInfo.name) || ip;
            const color = serverColors.value[ip] || getDeterministicColor(idx);

            const points: (number | null)[] = [];

            if (!hist || !hist.players_on || hist.players_on.length === 0) {
                for (let i = 0; i < labels.length; i++) {
                    points.push(null);
                }
            } else {
                const metricTs = hist.players_on.map(p => p[0]);
                const metricVals = hist.players_on.map(p => p[1]);
                const heartbeats = hist.heartbeats || [];
                const firstHb = heartbeats.length > 0 ? heartbeats[0] : (metricTs[0] || 0);
                const lastHb = heartbeats.length > 0 ? heartbeats[heartbeats.length - 1] : (metricTs[metricTs.length - 1] || 0);

                for (let i = 0; i < labels.length; i++) {
                    const unixSec = Math.floor(labels[i] / 1000);

                    // If before first heartbeat or far after last heartbeat, point is null
                    if (unixSec < firstHb - 600 || unixSec > lastHb + 3600) {
                        points.push(null);
                        continue;
                    }

                    // Check heartbeat downtime gap
                    if (heartbeats.length > 0) {
                        const hbIdx = binarySearchClosest(heartbeats, unixSec);
                        if (hbIdx >= 0) {
                            const closestHb = heartbeats[hbIdx];
                            if (Math.abs(unixSec - closestHb) > 3600) {
                                points.push(null); // 1h+ gap: downtime
                                continue;
                            }
                        }
                    }

                    const mIdx = binarySearchClosest(metricTs, unixSec);
                    if (mIdx >= 0 && mIdx < metricVals.length) {
                        const val = metricVals[mIdx];
                        points.push(val >= 0 ? val : null);
                    } else {
                        points.push(null);
                    }
                }
            }

            return {
                label: serverName,
                data: points,
                borderColor: color,
                backgroundColor: isFillEnabled.value ? hslToRgba(color, 0.12) : 'transparent',
                fill: isFillEnabled.value ? 'origin' : false,
                tension: 0.35,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHitRadius: 8,
                spanGaps: false,
                ip: ip,
            };
        });

        return { labels, datasets };
    });

    return {
        serverList,
        selectedServerIps,
        historyCache,
        isLoading,
        timeRange,
        searchFilter,
        isRegexEnabled,
        isFillEnabled,
        serverColors,
        filteredServers,
        rangeBounds,
        chartData,
        initGraph,
        toggleServer,
        selectTop,
        selectTopGlobal,
        clearAllSelected,
        setTimeRange,
        setSearchFilter,
        toggleRegex,
        toggleFill,
        fetchHistoryForServers,
    };
});

