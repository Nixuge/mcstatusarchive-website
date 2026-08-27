<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Bar } from 'vue-chartjs';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
    type ChartData,
    type ChartOptions
} from 'chart.js';

import { useGraphStore, isBlacklisted } from '@/stores/graph';
import type { Server } from '@/stores/serverlist';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const graphStore = useGraphStore();

onMounted(async () => {
    if (graphStore.serverList.length === 0) {
        await graphStore.initGraph();
    }
});

// Mode: 'servers' (count of servers) | 'players' (total online players) - Default: 'servers'
const metricMode = ref<'servers' | 'players'>('servers');

// Platform filter: 'all' | 'java' | 'bedrock'
const platformFilter = ref<'all' | 'java' | 'bedrock'>('all');

// Toggle: include offline / unreachable servers (default false: online only)
const includeOffline = ref<boolean>(false);

// Max ping cap selector: 100, 200, 300, 500, 750, 1000, 1500, 'custom', or 'all'
const maxPingCutoff = ref<number | string>(200);
const customPingValue = ref<number>(250);

interface PingBucket {
    label: string;
    minPing: number;
    maxPing: number;
    serverCount: number;
    playerCount: number;
    color: string;
    percentage: number;
}

function isServerOnline(server: Server): boolean {
    return server.players_on !== undefined &&
           server.players_on !== null &&
           server.players_on >= 0 &&
           server.ping !== undefined &&
           server.ping !== null &&
           server.ping >= 0;
}

function getPingColor(min: number): string {
    if (min < 0) return '#4e5359'; // Offline
    if (min < 30) return '#2ecc71'; // Low latency (Green)
    if (min < 60) return '#70db55'; // Good (Lime)
    if (min < 100) return '#f1c40f'; // Moderate (Yellow)
    if (min < 150) return '#e67e22'; // Fair (Orange)
    if (min < 250) return '#e74c3c'; // High (Red)
    return '#962d2d'; // Very High (Crimson)
}

const filteredServers = computed(() => {
    return graphStore.serverList.filter(server => {
        // Exclude blacklisted / spoofed servers
        if (isBlacklisted(server.ip)) return false;

        if (platformFilter.value === 'java') {
            if (server.type !== 0 && server.type !== undefined) return false;
        } else if (platformFilter.value === 'bedrock') {
            if (server.type !== 1) return false;
        }

        if (!includeOffline.value) {
            if (!isServerOnline(server)) return false;
        }

        return true;
    });
});

const totalServersCount = computed(() => filteredServers.value.length);
const totalPlayersCount = computed(() => {
    return filteredServers.value.reduce((sum, s) => sum + Math.max(0, s.players_on || 0), 0);
});

// Summary stats calculation (for online servers)
const statsSummary = computed(() => {
    const onlineList = filteredServers.value.filter(isServerOnline);
    if (onlineList.length === 0) {
        return { avg: 0, median: 0, min: 0, max: 0, onlineCount: 0 };
    }

    const pings = onlineList.map(s => s.ping).sort((a, b) => a - b);
    const sum = pings.reduce((acc, p) => acc + p, 0);
    const avg = Math.round(sum / pings.length);
    const mid = Math.floor(pings.length / 2);
    const median = pings.length % 2 === 0
        ? Math.round((pings[mid - 1] + pings[mid]) / 2)
        : pings[mid];
    const min = pings[0];
    const max = pings[pings.length - 1];

    return { avg, median, min, max, onlineCount: onlineList.length };
});

// Generate continuous 10ms buckets
const pingBuckets = computed<PingBucket[]>(() => {
    const servers = filteredServers.value;
    const onlineServers = servers.filter(isServerOnline);
    const offlineServers = servers.filter(s => !isServerOnline(s));

    if (onlineServers.length === 0 && offlineServers.length === 0) {
        return [];
    }

    // Determine upper limit for buckets
    let maxStep: number;
    if (maxPingCutoff.value === 'custom') {
        const customVal = Number(customPingValue.value);
        maxStep = customVal > 0 ? Math.max(10, Math.ceil(customVal / 10) * 10) : 200;
    } else if (maxPingCutoff.value !== 'all' && Number(maxPingCutoff.value) > 0) {
        maxStep = Number(maxPingCutoff.value);
    } else {
        const highestPing = onlineServers.reduce((max, s) => Math.max(max, s.ping), 0);
        maxStep = Math.max(10, Math.ceil(highestPing / 10) * 10);
    }

    // Initialize buckets for every 10ms step
    const bucketMap = new Map<number, { serverCount: number; playerCount: number }>();
    for (let p = 0; p < maxStep; p += 10) {
        bucketMap.set(p, { serverCount: 0, playerCount: 0 });
    }

    let overflowServerCount = 0;
    let overflowPlayerCount = 0;

    for (const server of onlineServers) {
        const ping = server.ping;
        const bucketStart = Math.floor(ping / 10) * 10;
        if (bucketStart < maxStep) {
            const entry = bucketMap.get(bucketStart)!;
            entry.serverCount += 1;
            entry.playerCount += Math.max(0, server.players_on || 0);
        } else {
            overflowServerCount += 1;
            overflowPlayerCount += Math.max(0, server.players_on || 0);
        }
    }

    const totalWeight = metricMode.value === 'servers'
        ? totalServersCount.value
        : totalPlayersCount.value;

    const result: PingBucket[] = [];

    // Add 10ms interval buckets
    for (let p = 0; p < maxStep; p += 10) {
        const data = bucketMap.get(p)!;
        const weight = metricMode.value === 'servers' ? data.serverCount : data.playerCount;
        const pct = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
        result.push({
            label: `${p}-${p + 10}ms`,
            minPing: p,
            maxPing: p + 10,
            serverCount: data.serverCount,
            playerCount: data.playerCount,
            color: getPingColor(p),
            percentage: pct,
        });
    }

    // Add overflow bucket if present
    if (overflowServerCount > 0) {
        const weight = metricMode.value === 'servers' ? overflowServerCount : overflowPlayerCount;
        const pct = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
        result.push({
            label: `>${maxStep}ms`,
            minPing: maxStep,
            maxPing: Infinity,
            serverCount: overflowServerCount,
            playerCount: overflowPlayerCount,
            color: getPingColor(maxStep),
            percentage: pct,
        });
    }

    // Add offline bucket if included
    if (includeOffline.value && offlineServers.length > 0) {
        const offServers = offlineServers.length;
        const offPlayers = offlineServers.reduce((sum, s) => sum + Math.max(0, s.players_on || 0), 0);
        const weight = metricMode.value === 'servers' ? offServers : offPlayers;
        const pct = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
        result.push({
            label: 'Offline / Timeout',
            minPing: -1,
            maxPing: -1,
            serverCount: offServers,
            playerCount: offPlayers,
            color: '#4e5359',
            percentage: pct,
        });
    }

    return result;
});

// Non-zero ranked buckets for sidebar breakdown
const nonZeroBuckets = computed(() => {
    return pingBuckets.value.filter(b => b.serverCount > 0);
});

// Chart.js Data configuration
const chartData = computed<ChartData<'bar'>>(() => {
    const buckets = pingBuckets.value;
    const labels = buckets.map(b => b.label);
    const data = buckets.map(b => (metricMode.value === 'servers' ? b.serverCount : b.playerCount));
    const backgroundColor = buckets.map(b => b.color);

    return {
        labels,
        datasets: [
            {
                label: metricMode.value === 'servers' ? 'Servers' : 'Players',
                data,
                backgroundColor,
                borderColor: '#1a1a1a',
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false,
                hoverBackgroundColor: '#fc9802',
                hoverBorderColor: '#ffffff',
                hoverBorderWidth: 2,
            }
        ]
    };
});

// Chart.js Options configuration
const chartOptions = computed<ChartOptions<'bar'>>(() => {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 350,
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(10, 10, 10, 0.95)',
                titleColor: '#fc9802',
                bodyColor: '#dddddd',
                borderColor: '#666666',
                borderWidth: 1,
                padding: 10,
                displayColors: false,
                callbacks: {
                    title: (items: any) => {
                        const idx = items[0]?.dataIndex;
                        const b = pingBuckets.value[idx];
                        return b ? `Latency: ${b.label}` : '';
                    },
                    label: (context: any) => {
                        const idx = context.dataIndex;
                        const b = pingBuckets.value[idx];
                        if (!b) return '';
                        if (metricMode.value === 'servers') {
                            return [
                                `Servers: ${b.serverCount.toLocaleString()} (${b.percentage.toFixed(1)}%)`,
                                `Players: ${b.playerCount.toLocaleString()}`
                            ];
                        } else {
                            return [
                                `Players: ${b.playerCount.toLocaleString()} (${b.percentage.toFixed(1)}%)`,
                                `Servers: ${b.serverCount.toLocaleString()}`
                            ];
                        }
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.06)',
                },
                ticks: {
                    color: '#aaaaaa',
                    font: {
                        family: 'minecraftio',
                        size: 10,
                    },
                    maxRotation: 45,
                    minRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 20,
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(255, 255, 255, 0.08)',
                },
                ticks: {
                    color: '#aaaaaa',
                    font: {
                        family: 'minecraftio',
                        size: 11,
                    },
                    precision: 0,
                }
            }
        }
    };
});
</script>

<template>
    <div class="ping-bar-container">
        <!-- Controls Toolbar -->
        <div class="pie-toolbar">
            <!-- Weight by: Servers first, then Players -->
            <div class="toolbar-group">
                <span class="toolbar-label">Weight by:</span>
                <div class="btn-group">
                    <button
                        class="mc-btn"
                        :class="{ 'active': metricMode === 'servers' }"
                        @click="metricMode = 'servers'"
                    >
                        🖥️ Servers
                    </button>
                    <button
                        class="mc-btn"
                        :class="{ 'active': metricMode === 'players' }"
                        @click="metricMode = 'players'"
                    >
                        👥 Players
                    </button>
                </div>
            </div>

            <!-- Platform filter: All, Java, Bedrock -->
            <div class="toolbar-group">
                <span class="toolbar-label">Platform:</span>
                <div class="btn-group">
                    <button
                        class="mc-btn"
                        :class="{ 'active': platformFilter === 'all' }"
                        @click="platformFilter = 'all'"
                    >
                        All
                    </button>
                    <button
                        class="mc-btn"
                        :class="{ 'active': platformFilter === 'java' }"
                        @click="platformFilter = 'java'"
                    >
                        Java
                    </button>
                    <button
                        class="mc-btn"
                        :class="{ 'active': platformFilter === 'bedrock' }"
                        @click="platformFilter = 'bedrock'"
                    >
                        Bedrock
                    </button>
                </div>
            </div>

            <!-- Max Range Limit Filter -->
            <div class="toolbar-group">
                <span class="toolbar-label">Range:</span>
                <select v-model="maxPingCutoff" class="mc-select">
                    <option :value="100">0 - 100ms</option>
                    <option :value="200">0 - 200ms</option>
                    <option :value="300">0 - 300ms</option>
                    <option :value="500">0 - 500ms</option>
                    <option :value="750">0 - 750ms</option>
                    <option :value="1000">0 - 1000ms</option>
                    <option :value="1500">0 - 1500ms</option>
                    <option value="custom">Custom...</option>
                    <option value="all">Full Range</option>
                </select>
                <div v-if="maxPingCutoff === 'custom'" class="custom-range-wrapper">
                    <input
                        type="number"
                        v-model.number="customPingValue"
                        min="10"
                        step="10"
                        max="10000"
                        placeholder="Max"
                        class="mc-number-input"
                    />
                    <span class="input-suffix">ms</span>
                </div>
            </div>

            <!-- Online / Offline toggle -->
            <div class="toolbar-group">
                <button
                    class="mc-btn toggle-btn"
                    :class="{ 'active': includeOffline }"
                    @click="includeOffline = !includeOffline"
                    :title="includeOffline ? 'Showing all servers including offline/unreachable' : 'Showing only currently online servers'"
                >
                    {{ includeOffline ? '🔴 Offline Included' : '🟢 Online Only' }}
                </button>
            </div>
        </div>

        <!-- Main Content Section -->
        <div class="pie-content-wrapper">
            <!-- Left: Smooth Bar Chart -->
            <div class="chart-box">
                <div class="chart-canvas-container">
                    <Bar :data="chartData" :options="chartOptions" />
                </div>
            </div>

            <!-- Right: Stats & Breakdown List -->
            <div class="legend-box">
                <h3 class="legend-title">Latency Overview & Breakdown</h3>

                <!-- Summary Stat Pills -->
                <div class="ping-summary-cards">
                    <div class="summary-card">
                        <span class="summary-card-label">Average</span>
                        <span class="summary-card-val">{{ statsSummary.avg }}ms</span>
                    </div>
                    <div class="summary-card">
                        <span class="summary-card-label">Median</span>
                        <span class="summary-card-val">{{ statsSummary.median }}ms</span>
                    </div>
                    <div class="summary-card">
                        <span class="summary-card-label">Min / Max</span>
                        <span class="summary-card-val">{{ statsSummary.min }} / {{ statsSummary.max }}ms</span>
                    </div>
                </div>

                <div class="legend-scroll-list">
                    <div
                        v-for="(item, idx) in nonZeroBuckets"
                        :key="item.label"
                        class="legend-row"
                    >
                        <div class="legend-row-left">
                            <span class="legend-rank">#{{ idx + 1 }}</span>
                            <span
                                class="color-indicator"
                                :style="{ backgroundColor: item.color, borderColor: item.color }"
                            />
                            <span class="range-name" :title="item.label">{{ item.label }}</span>
                        </div>
                        <div class="legend-row-right">
                            <span class="stat-count">
                                {{ metricMode === 'servers' ? item.serverCount + ' servers' : item.playerCount.toLocaleString() + ' players' }}
                            </span>
                            <span class="stat-badge">
                                {{ item.percentage.toFixed(1) }}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.ping-bar-container {
    width: 90%;
    margin: 0 auto;
    padding: 0 0 20px 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    height: 100%;
}

/* Toolbar */
.pie-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-bottom: 16px;
    background-color: rgba(0, 0, 0, 0.45);
    border: 1px solid #444;
    border-radius: 4px;
    padding: 8px 16px;
}

.toolbar-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.toolbar-label {
    font-size: 13px;
    color: #bbb;
}

.btn-group {
    display: flex;
    gap: 2px;
}

.mc-btn {
    background-color: #242424;
    border: 1px solid #555;
    color: #ccc;
    font-family: minecraftio, sans-serif;
    font-size: 12px;
    padding: 5px 10px;
    cursor: pointer;
    transition: all 0.15s ease;
}

.mc-btn:hover {
    background-color: #383838;
    color: #fc9802;
    border-color: #fc9802;
}

.mc-btn.active {
    background-color: #3a2e1d;
    color: #fc9802;
    border-color: #fc9802;
    box-shadow: inset 0 0 4px rgba(252, 152, 2, 0.5);
}

.toggle-btn.active {
    background-color: #422525;
    color: #ff8888;
    border-color: #ff5555;
    box-shadow: inset 0 0 4px rgba(255, 85, 85, 0.4);
}

.mc-select {
    background-color: #242424;
    border: 1px solid #555;
    color: #fff;
    font-family: minecraftio, sans-serif;
    font-size: 12px;
    padding: 4px 8px;
    cursor: pointer;
    border-radius: 2px;
}

.custom-range-wrapper {
    display: flex;
    align-items: center;
    gap: 4px;
}

.mc-number-input {
    background-color: #242424;
    border: 1px solid #555;
    color: #fc9802;
    font-family: minecraftio, sans-serif;
    font-size: 12px;
    padding: 4px 6px;
    width: 68px;
    border-radius: 2px;
    outline: none;
    box-sizing: border-box;
}

.mc-number-input:focus {
    border-color: #fc9802;
}

.input-suffix {
    font-size: 12px;
    color: #888;
}

/* Main Content Wrapper */
.pie-content-wrapper {
    flex: 1;
    display: flex;
    gap: 20px;
    min-height: 0;
    height: 100%;
    width: 100%;
}

@media (max-width: 860px) {
    .pie-content-wrapper {
        flex-direction: column;
    }
    .chart-box, .legend-box {
        width: 100% !important;
        max-width: 100% !important;
        flex: 1 1 auto !important;
    }
}

/* Chart Box */
.chart-box {
    flex: 1 1 70%;
    width: 70%;
    max-width: 70%;
    min-width: 0;
    background-color: rgba(0, 0, 0, 0.55);
    border: 1px solid #444;
    border-radius: 4px;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    min-height: 0;
    box-sizing: border-box;
}

.chart-canvas-container {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 380px;
}

/* Legend Box */
.legend-box {
    flex: 1 1 30%;
    width: 30%;
    max-width: 30%;
    min-width: 0;
    background-color: rgba(0, 0, 0, 0.55);
    border: 1px solid #444;
    border-radius: 4px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    min-height: 0;
    box-sizing: border-box;
}

.legend-title {
    font-size: 15px;
    color: #fc9802;
    margin: 0 0 10px 0;
    text-align: left;
    border-bottom: 1px solid #333;
    padding-bottom: 6px;
    font-weight: normal;
}

/* Summary Cards */
.ping-summary-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 12px;
}

.summary-card {
    background-color: #1a1a1a;
    border: 1px solid #333;
    border-radius: 4px;
    padding: 6px 8px;
    text-align: center;
}

.summary-card-label {
    display: block;
    font-size: 10px;
    color: #888;
    text-transform: uppercase;
}

.summary-card-val {
    display: block;
    font-size: 13px;
    color: #fc9802;
    font-weight: bold;
    margin-top: 2px;
}

.legend-scroll-list {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    padding-right: 4px;
    scrollbar-width: thin;
    scrollbar-color: #555 #222;
}

.legend-scroll-list::-webkit-scrollbar {
    width: 6px;
}

.legend-scroll-list::-webkit-scrollbar-thumb {
    background-color: #555;
    border-radius: 3px;
}

.legend-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    border-bottom: 1px solid #282828;
    border-radius: 3px;
    transition: background-color 0.15s ease;
}

.legend-row:hover {
    background-color: rgba(252, 152, 2, 0.12);
}

.legend-row-left {
    display: flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;
    flex: 1;
    min-width: 0;
}

.legend-rank {
    font-size: 11px;
    color: #666;
    min-width: 22px;
    flex-shrink: 0;
}

.color-indicator {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    flex-shrink: 0;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
}

.range-name {
    font-size: 13px;
    color: #eee;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
}

.legend-row-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    margin-left: 12px;
}

.stat-count {
    font-size: 12px;
    color: #aaa;
}

.stat-badge {
    font-size: 11px;
    background-color: #222;
    border: 1px solid #444;
    color: #fc9802;
    padding: 2px 6px;
    border-radius: 3px;
    min-width: 44px;
    text-align: center;
}
</style>
