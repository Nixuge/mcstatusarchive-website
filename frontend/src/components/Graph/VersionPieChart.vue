<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Doughnut } from 'vue-chartjs';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    type ChartData,
    type ChartOptions
} from 'chart.js';

import { useGraphStore, isBlacklisted, getDeterministicColor, hslToRgba } from '@/stores/graph';
import type { Server } from '@/stores/serverlist';
import { getProtocolVersionLabel } from '@/ts/utils/protocolVersions';

ChartJS.register(ArcElement, Tooltip, Legend);

const graphStore = useGraphStore();

onMounted(async () => {
    if (graphStore.serverList.length === 0) {
        await graphStore.initGraph();
    }
});

// Mode: 'servers' (count of servers) | 'players' (total online players) - Default: 'servers'
const metricMode = ref<'servers' | 'players'>('servers');

// Category mode: 'java_name' | 'java_protocol' | 'bedrock'
const categoryMode = ref<'java_name' | 'java_protocol' | 'bedrock'>('java_name');

// Toggle: include offline / unreachable servers (default false: online only)
const includeOffline = ref<boolean>(false);

// Per-category saved version limit state
const categoryLimits = ref<{
    java_name: number;
    java_protocol: number;
    bedrock: number;
}>({
    java_name: 25,
    java_protocol: 25,
    bedrock: 25,
});

// Custom DOM Tooltip State to ensure it is always layered above center text
const hoverTooltip = ref<{
    visible: boolean;
    x: number;
    y: number;
    title: string;
    bodyLines: string[];
    color: string;
}>({
    visible: false,
    x: 0,
    y: 0,
    title: '',
    bodyLines: [],
    color: '',
});

interface VersionStat {
    version: string;
    serverCount: number;
    playerCount: number;
    color: string;
    percentage: number;
}

function isServerOnline(server: Server): boolean {
    return server.players_on !== undefined &&
           server.players_on !== null &&
           server.players_on >= 0 &&
           server.version_name !== null &&
           server.version_name !== undefined &&
           server.version_name.trim() !== '';
}

function cleanVersionName(raw: string | undefined | null): string {
    if (!raw || raw.trim() === '') return 'Offline / Unreachable';
    return raw.trim();
}

const filteredServers = computed(() => {
    return graphStore.serverList.filter(server => {
        // Exclude blacklisted / spoofed servers
        if (isBlacklisted(server.ip)) return false;

        if (categoryMode.value === 'java_name' || categoryMode.value === 'java_protocol') {
            if (server.type !== 0 && server.type !== undefined) return false;
        } else if (categoryMode.value === 'bedrock') {
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

function getVersionKey(server: Server): string {
    if (!isServerOnline(server)) {
        return 'Offline / Unreachable';
    }
    if (categoryMode.value === 'java_protocol') {
        if (server.version_protocol !== undefined && server.version_protocol !== null && server.version_protocol !== -1) {
            return getProtocolVersionLabel(server.version_protocol);
        }
        return 'Offline / Unreachable';
    }
    return cleanVersionName(server.version_name);
}

// All aggregated stats before slicing
const allVersionStats = computed<VersionStat[]>(() => {
    const map = new Map<string, { serverCount: number; playerCount: number }>();

    for (const server of filteredServers.value) {
        const key = getVersionKey(server);
        const existing = map.get(key) || { serverCount: 0, playerCount: 0 };
        existing.serverCount += 1;
        existing.playerCount += Math.max(0, server.players_on || 0);
        map.set(key, existing);
    }

    const totalWeight = metricMode.value === 'servers'
        ? totalServersCount.value
        : totalPlayersCount.value;

    const list: VersionStat[] = [];
    let idx = 0;
    for (const [version, data] of map.entries()) {
        const weight = metricMode.value === 'servers' ? data.serverCount : data.playerCount;
        const pct = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
        // Distinct color: Crimson red for Offline / Unreachable
        const color = version === 'Offline / Unreachable' ? '#a83838' : getDeterministicColor(idx++);
        list.push({
            version,
            serverCount: data.serverCount,
            playerCount: data.playerCount,
            color,
            percentage: pct,
        });
    }

    // Sort descending by current metric weight
    list.sort((a, b) => {
        const weightA = metricMode.value === 'servers' ? a.serverCount : a.playerCount;
        const weightB = metricMode.value === 'servers' ? b.serverCount : b.playerCount;
        return weightB - weightA;
    });

    return list;
});

const totalUniqueVersions = computed(() => allVersionStats.value.length);

// Dynamic version limit options scoped to the current category
const limitOptions = computed(() => {
    const total = totalUniqueVersions.value;
    if (total <= 0) return [25];
    if (total <= 25) {
        return [total];
    }
    const opts: number[] = [];
    for (let i = 25; i < total; i += 25) {
        opts.push(i);
    }
    if (!opts.includes(total)) {
        opts.push(total);
    }
    return opts;
});

// Category-scoped version limit accessor
const maxSlices = computed<number>({
    get() {
        const total = totalUniqueVersions.value;
        if (total <= 0) return 25;
        if (total <= 25) return total;
        const stored = categoryLimits.value[categoryMode.value];
        if (stored && stored <= total) {
            return stored;
        }
        if (stored && stored > total) {
            return total;
        }
        return 25;
    },
    set(val: number) {
        categoryLimits.value[categoryMode.value] = val;
    }
});

// Sliced list for chart and legend
const aggregatedStats = computed<VersionStat[]>(() => {
    const list = allVersionStats.value;
    const limit = maxSlices.value;
    const totalWeight = metricMode.value === 'servers'
        ? totalServersCount.value
        : totalPlayersCount.value;

    if (list.length > limit) {
        const top = list.slice(0, limit);
        const rest = list.slice(limit);

        const otherServerCount = rest.reduce((sum, item) => sum + item.serverCount, 0);
        const otherPlayerCount = rest.reduce((sum, item) => sum + item.playerCount, 0);
        const otherWeight = metricMode.value === 'servers' ? otherServerCount : otherPlayerCount;
        const otherPct = totalWeight > 0 ? (otherWeight / totalWeight) * 100 : 0;

        top.push({
            version: `Other (${rest.length} versions)`,
            serverCount: otherServerCount,
            playerCount: otherPlayerCount,
            color: '#4e5359', // Distinct slate-grey for grouped tail
            percentage: otherPct,
        });
        return top;
    }

    return list;
});

// Chart.js Data configuration
const chartData = computed<ChartData<'doughnut'>>(() => {
    const stats = aggregatedStats.value;
    const labels = stats.map(s => s.version);
    const data = stats.map(s => (metricMode.value === 'servers' ? s.serverCount : s.playerCount));
    const backgroundColor = stats.map(s => {
        if (s.color.startsWith('#')) {
            return s.color;
        }
        return hslToRgba(s.color, 0.85);
    });
    const borderColor = stats.map(s => s.color);

    return {
        labels,
        datasets: [
            {
                data,
                backgroundColor,
                borderColor: '#1a1a1a',
                borderWidth: 2,
                hoverBorderColor: '#ffffff',
                hoverBorderWidth: 3,
                hoverOffset: 8,
            }
        ]
    };
});

// Chart.js Options configuration with custom DOM tooltip positioning
const chartOptions = computed<ChartOptions<'doughnut'>>(() => {
    return {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        animation: {
            animateRotate: true,
            animateScale: true,
            duration: 400,
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                enabled: false,
                external: (context: any) => {
                    const { tooltip } = context;
                    if (!tooltip || tooltip.opacity === 0) {
                        hoverTooltip.value.visible = false;
                        return;
                    }

                    const idx = tooltip.dataPoints?.[0]?.dataIndex;
                    if (idx === undefined) {
                        hoverTooltip.value.visible = false;
                        return;
                    }

                    const item = aggregatedStats.value[idx];
                    if (!item) {
                        hoverTooltip.value.visible = false;
                        return;
                    }

                    hoverTooltip.value.visible = true;
                    hoverTooltip.value.x = tooltip.caretX;
                    hoverTooltip.value.y = tooltip.caretY;
                    hoverTooltip.value.title = item.version;
                    hoverTooltip.value.color = item.color;

                    if (metricMode.value === 'servers') {
                        hoverTooltip.value.bodyLines = [
                            `${item.serverCount.toLocaleString()} servers (${item.percentage.toFixed(1)}%)`,
                            `${item.playerCount.toLocaleString()} players online`
                        ];
                    } else {
                        hoverTooltip.value.bodyLines = [
                            `${item.playerCount.toLocaleString()} players (${item.percentage.toFixed(1)}%)`,
                            `${item.serverCount.toLocaleString()} servers running`
                        ];
                    }
                }
            }
        }
    };
});

function handleCanvasMouseLeave() {
    hoverTooltip.value.visible = false;
}
</script>

<template>
    <div class="version-pie-container">
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

            <!-- Category: Java (version name), Java (protocol version), Bedrock -->
            <div class="toolbar-group">
                <span class="toolbar-label">Category:</span>
                <div class="btn-group">
                    <button
                        class="mc-btn"
                        :class="{ 'active': categoryMode === 'java_name' }"
                        @click="categoryMode = 'java_name'"
                    >
                        Java (version name)
                    </button>
                    <button
                        class="mc-btn"
                        :class="{ 'active': categoryMode === 'java_protocol' }"
                        @click="categoryMode = 'java_protocol'"
                    >
                        Java (protocol version)
                    </button>
                    <button
                        class="mc-btn"
                        :class="{ 'active': categoryMode === 'bedrock' }"
                        @click="categoryMode = 'bedrock'"
                    >
                        Bedrock
                    </button>
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

            <!-- Version limit: Increments of 25 up to max, dynamically adapted to category -->
            <div class="toolbar-group">
                <span class="toolbar-label">Version limit:</span>
                <select v-model.number="maxSlices" class="mc-select">
                    <option
                        v-for="opt in limitOptions"
                        :key="opt"
                        :value="opt"
                    >
                        {{ opt === totalUniqueVersions ? `All (${opt})` : opt }}
                    </option>
                </select>
            </div>
        </div>

        <!-- Main Content Section -->
        <div class="pie-content-wrapper">
            <!-- Left: Doughnut Chart with Center Stat -->
            <div class="chart-box" @mouseleave="handleCanvasMouseLeave">
                <div class="chart-canvas-container">
                    <Doughnut :data="chartData" :options="chartOptions" />
                    
                    <!-- Center Summary Badge (z-index: 1) -->
                    <div class="chart-center-overlay">
                        <span class="center-value">
                            {{ metricMode === 'servers' ? totalServersCount.toLocaleString() : totalPlayersCount.toLocaleString() }}
                        </span>
                        <span class="center-label">
                            {{ metricMode === 'servers' ? 'Total Servers' : 'Total Players' }}
                        </span>
                    </div>

                    <!-- Floating Custom Tooltip (z-index: 10 - always sits on top of center text) -->
                    <div
                        v-if="hoverTooltip.visible"
                        class="pie-floating-tooltip"
                        :style="{ left: hoverTooltip.x + 'px', top: hoverTooltip.y + 'px' }"
                    >
                        <div class="tooltip-header">
                            <span class="tooltip-color-dot" :style="{ backgroundColor: hoverTooltip.color }"></span>
                            <span class="tooltip-title">{{ hoverTooltip.title }}</span>
                        </div>
                        <div class="tooltip-body">
                            <div
                                v-for="(line, lIdx) in hoverTooltip.bodyLines"
                                :key="lIdx"
                                class="tooltip-line"
                            >
                                {{ line }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right: Ranked Breakdown List -->
            <div class="legend-box">
                <h3 class="legend-title">
                    {{ categoryMode === 'java_protocol' ? 'Protocol Version Breakdown' : 'Version Share Breakdown' }}
                </h3>
                <div class="legend-scroll-list">
                    <div
                        v-for="(item, idx) in aggregatedStats"
                        :key="item.version"
                        class="legend-row"
                    >
                        <div class="legend-row-left">
                            <span class="legend-rank">#{{ idx + 1 }}</span>
                            <span
                                class="color-indicator"
                                :style="{ backgroundColor: item.color, borderColor: item.color }"
                            />
                            <span class="version-name" :title="item.version">{{ item.version }}</span>
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
.version-pie-container {
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
    flex: 1 1 54%;
    width: 54%;
    max-width: 54%;
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
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Center summary text with z-index: 1 */
.chart-center-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
    z-index: 1;
}

.center-value {
    display: block;
    font-size: 26px;
    font-weight: bold;
    color: #ffffff;
    text-shadow: 2px 2px 0px #000;
}

.center-label {
    display: block;
    font-size: 12px;
    color: #888888;
    margin-top: 2px;
}

/* Floating custom tooltip with z-index: 10 (always above center text) */
.pie-floating-tooltip {
    position: absolute;
    pointer-events: none;
    transform: translate(-50%, -125%);
    background-color: rgba(10, 10, 10, 0.92);
    border: 1px solid #666;
    border-radius: 4px;
    padding: 8px 12px;
    z-index: 10;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.85);
    white-space: nowrap;
    text-align: left;
}

.tooltip-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
}

.tooltip-color-dot {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    display: inline-block;
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.6);
}

.tooltip-title {
    font-size: 13px;
    color: #fc9802;
    font-weight: bold;
}

.tooltip-line {
    font-size: 11px;
    color: #ddd;
    line-height: 1.4;
}

/* Legend Box */
.legend-box {
    flex: 1 1 46%;
    width: 46%;
    max-width: 46%;
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
    margin: 0 0 12px 0;
    text-align: left;
    border-bottom: 1px solid #333;
    padding-bottom: 6px;
    font-weight: normal;
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

.version-name {
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
