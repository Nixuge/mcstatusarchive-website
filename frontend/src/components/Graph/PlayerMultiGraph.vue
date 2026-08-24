<script setup lang="ts">
import { ref, computed, watch, onMounted, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Line } from 'vue-chartjs';
import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    CategoryScale,
    TimeScale,
    Filler,
    type Plugin,
} from 'chart.js';
import 'chartjs-adapter-luxon';

import { useGraphStore, type TimeRange } from '@/stores/graph';
import ServerDropdownPicker from './ServerDropdownPicker.vue';
import GraphTooltip, { type TooltipServerItem } from './GraphTooltip.vue';

ChartJS.register(
    Title,
    Tooltip,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    CategoryScale,
    TimeScale,
    Filler
);

const route = useRoute();
const router = useRouter();
const graphStore = useGraphStore();

const isPickerOpen = ref(false);
const chartKey = ref(0);

// Tooltip state
const tooltipVisible = ref(false);
const tooltipX = ref(0);
const tooltipY = ref(0);
const tooltipTimestamp = ref(0);
const tooltipServers: Ref<TooltipServerItem[]> = ref([]);

// Active hovered index for custom plugin crosshair & point halos
const hoveredIndex = ref<number | null>(null);
const hoveredXPixel = ref<number | null>(null);

function setTimeRange(range: TimeRange) {
    graphStore.setTimeRange(range);
    chartKey.value++;
    syncUrl();
}

function toggleFill() {
    graphStore.toggleFill();
    chartKey.value++;
}


function syncUrl() {
    const query: Record<string, string> = {};
    if (graphStore.selectedServerIps.length > 0) {
        query.servers = graphStore.selectedServerIps.join(',');
    }
    if (graphStore.timeRange !== '1d') {
        query.range = graphStore.timeRange;
    }
    router.replace({ query }).catch(() => {});
}

watch(() => graphStore.selectedServerIps, () => {
    chartKey.value++;
    syncUrl();
}, { deep: true });

function togglePicker(e: MouseEvent) {
    e.stopPropagation();
    isPickerOpen.value = !isPickerOpen.value;
}

function closePicker() {
    isPickerOpen.value = false;
}



// Custom plugin to draw vertical crosshair and glowing point markers on hover
const crosshairPlugin: Plugin = {
    id: 'mcCrosshair',
    afterDraw: (chart) => {
        const hIdx = hoveredIndex.value;
        const xPix = hoveredXPixel.value;
        if (hIdx === null || xPix === null) return;

        const { ctx, chartArea: { top, bottom, left, right } } = chart;
        if (xPix < left || xPix > right) return;

        ctx.save();

        // 1. Draw vertical dashed crosshair line
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.moveTo(xPix, top);
        ctx.lineTo(xPix, bottom);
        ctx.stroke();
        ctx.restore();

        // 2. Draw highlighted halo points on lines
        ctx.save();
        chart.data.datasets.forEach((dataset, datasetIdx) => {
            const meta = chart.getDatasetMeta(datasetIdx);
            if (!meta || meta.hidden) return;
            const element = meta.data[hIdx];
            if (!element) return;

            const yVal = dataset.data[hIdx];
            if (yVal === null || yVal === undefined || isNaN(Number(yVal))) return;

            const color = (dataset.borderColor as string) || '#fc9802';
            const { x, y } = element;

            // Outer translucent halo ring
            ctx.beginPath();
            ctx.arc(x, y, 7.5, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.4;
            ctx.fill();

            // Inner solid point with white border
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
        });
        ctx.restore();
    }
};

const chartOptions = computed<any>(() => {
    const bounds = graphStore.rangeBounds;
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 150,
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                enabled: false,
            },
        },
        scales: {
            x: {
                type: 'time',
                min: bounds.startMs,
                max: bounds.endMs,
                grid: {
                    color: 'rgba(255, 255, 255, 0.08)',
                    tickLength: 6,
                },
                ticks: {
                    color: '#c0c0c0',
                    font: {
                        family: "minecraftio, sans-serif",
                        size: 11,
                    },
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 8,
                },
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(255, 255, 255, 0.08)',
                },
                ticks: {
                    color: '#c0c0c0',
                    font: {
                        family: "minecraftio, sans-serif",
                        size: 11,
                    },
                    callback: (value: number) => {
                        if (value >= 1000) {
                            return (value / 1000).toFixed(0) + 'k';
                        }
                        return value;
                    },
                },
            },
        },
        onHover: (event: any, elements: any[], chart: any) => {
            if (!event || !chart) return;

            const nativeEvent = event.native;
            if (!nativeEvent) return;

            const { chartArea } = chart;
            const xPos = event.x;
            const yPos = event.y;

            if (
                xPos < chartArea.left ||
                xPos > chartArea.right ||
                yPos < chartArea.top ||
                yPos > chartArea.bottom
            ) {
                tooltipVisible.value = false;
                hoveredIndex.value = null;
                hoveredXPixel.value = null;
                chart.draw();
                return;
            }

            const labels = graphStore.chartData.labels;
            if (!labels || labels.length === 0) return;

            const xTimestamp = chart.scales.x.getValueForPixel(xPos);
            if (!xTimestamp) return;

            let closestIdx = 0;
            let minDiff = Number.MAX_VALUE;
            for (let i = 0; i < labels.length; i++) {
                const diff = Math.abs(labels[i] - xTimestamp);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestIdx = i;
                }
            }

            const activeTs = labels[closestIdx];
            const hoveredX = chart.scales.x.getPixelForValue(activeTs);

            hoveredIndex.value = closestIdx;
            hoveredXPixel.value = hoveredX;

            const items: TooltipServerItem[] = [];
            graphStore.chartData.datasets.forEach((ds: any) => {
                const val = ds.data[closestIdx];
                items.push({
                    name: ds.label,
                    ip: ds.ip,
                    color: ds.borderColor,
                    playerCount: val !== null && val !== undefined ? Number(val) : null,
                });
            });

            tooltipTimestamp.value = activeTs;
            tooltipServers.value = items;
            tooltipX.value = nativeEvent.clientX;
            tooltipY.value = nativeEvent.clientY;
            tooltipVisible.value = true;

            chart.draw();
        },
    };
});

function handleMouseLeave() {
    tooltipVisible.value = false;
    hoveredIndex.value = null;
    hoveredXPixel.value = null;
}

onMounted(() => {
    const serversParam = route.query.servers as string | undefined;
    const rangeParam = route.query.range as string | undefined;
    graphStore.initGraph({
        servers: serversParam,
        range: rangeParam,
    });
});
</script>

<template>
    <div class="graph-section">
        <div class="graph-toolbar" @mouseenter="handleMouseLeave">
            <div class="range-buttons">
                <button 
                    class="mc-range-btn" 
                    :class="{ active: graphStore.timeRange === '1d' }"
                    @click="setTimeRange('1d')"
                >
                    1D
                </button>
                <button 
                    class="mc-range-btn" 
                    :class="{ active: graphStore.timeRange === '7d' }"
                    @click="setTimeRange('7d')"
                >
                    7D
                </button>
                <button 
                    class="mc-range-btn" 
                    :class="{ active: graphStore.timeRange === '30d' }"
                    @click="setTimeRange('30d')"
                >
                    30D
                </button>
                <button 
                    class="mc-range-btn" 
                    :class="{ active: graphStore.timeRange === 'max' }"
                    @click="setTimeRange('max')"
                >
                    MAX
                </button>
                <button 
                    class="mc-range-btn fill-btn" 
                    :class="{ active: graphStore.isFillEnabled }"
                    @click="toggleFill"
                    title="Toggle translucent area shading under lines"
                >
                    Fill: {{ graphStore.isFillEnabled ? 'ON' : 'OFF' }}
                </button>
            </div>

            <div class="server-picker-anchor" @mouseenter="handleMouseLeave">
                <button class="mc-selector-btn" @click="togglePicker" @mouseenter="handleMouseLeave">
                    SERVEURS ({{ graphStore.selectedServerIps.length }}) ▾
                </button>

                <ServerDropdownPicker 
                    :is-open="isPickerOpen" 
                    @close="closePicker"
                    @hoverPicker="handleMouseLeave"
                />
            </div>
        </div>

        <div id="player_multi_stats" @mouseleave="handleMouseLeave">
            <div v-if="graphStore.isLoading && graphStore.chartData.datasets.length === 0" class="loading-state">
                <span>Chargement des données historiques...</span>
            </div>

            <div v-else-if="graphStore.selectedServerIps.length === 0" class="empty-state">
                <p>Aucun serveur sélectionné.</p>
                <button class="mc-action-btn" @click="graphStore.selectTopGlobal(15)">
                    Sélectionner les 15 premiers serveurs
                </button>
            </div>

            <Line 
                v-else
                :key="chartKey"
                :data="graphStore.chartData" 
                :options="chartOptions" 
                :plugins="[crosshairPlugin]"
            />
        </div>

        <GraphTooltip 
            :visible="tooltipVisible"
            :x="tooltipX"
            :y="tooltipY"
            :timestamp="tooltipTimestamp"
            :servers="tooltipServers"
        />
    </div>
</template>

<style scoped>
.graph-section {
    width: 100%;
    margin: 0 auto;
    font-family: minecraftio, sans-serif;
    color: #ffffff;
    box-sizing: border-box;
}

.graph-toolbar {
    width: 90%;
    margin: 0 auto 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
}

.range-buttons {
    display: flex;
    gap: 6px;
}

.mc-range-btn {
    background: #000000;
    border: 1px solid #6f6f6f;
    color: #c0c0c0;
    padding: 5px 14px;
    font-size: 13px;
    font-family: minecraftio, sans-serif;
    cursor: pointer;
    transition: all 0.1s;
}

.mc-range-btn:hover {
    background: #242424;
    color: #ffffff;
    border-color: #999;
}

.mc-range-btn.active {
    background: #1e1e1e;
    color: #fc9802;
    border: 2px solid #fc9802;
    padding: 4px 13px;
}

.server-picker-anchor {
    position: relative;
}

.mc-selector-btn {
    background: #000000;
    border: 1px solid #6f6f6f;
    color: #ffffff;
    padding: 6px 14px;
    font-size: 13px;
    font-family: minecraftio, sans-serif;
    cursor: pointer;
    transition: all 0.1s;
}

.mc-selector-btn:hover {
    background: #242424;
    border-color: #888888;
}

#player_multi_stats {
    width: 90%;
    background-color: rgba(0, 0, 0, 0.35);
    margin: auto;
    height: calc(100vh - 160px);
    min-height: 520px;
    position: relative;
    border: 2px solid #6f6f6f;
    box-sizing: border-box;
}


.loading-state,
.empty-state {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #a1a1aa;
    font-size: 14px;
}

.mc-action-btn {
    background: #000;
    border: 1px solid #fc9802;
    color: #fc9802;
    padding: 6px 16px;
    font-size: 13px;
    font-family: minecraftio, sans-serif;
    cursor: pointer;
}

.mc-action-btn:hover {
    background: #fc9802;
    color: #000;
}
</style>
