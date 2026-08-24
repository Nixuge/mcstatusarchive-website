<script setup lang="ts">
import { computed } from 'vue';

export interface TooltipServerItem {
    name: string;
    ip: string;
    color: string;
    playerCount: number | null;
}

const props = defineProps<{
    visible: boolean;
    x: number;
    y: number;
    timestamp: number;
    servers: TooltipServerItem[];
}>();

function formatNumber(num: number | null | undefined) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatDate(tsMs: number) {
    if (!tsMs || isNaN(tsMs)) return '';
    const date = new Date(tsMs);
    try {
        const lang = navigator.language || 'fr-FR';
        const dayStr = new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(date);
        const dayNum = date.getDate();
        const monthStr = new Intl.DateTimeFormat(lang, { month: 'short' }).format(date);
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${dayStr} ${dayNum} ${monthStr} ${year} ${hours}:${minutes}`;
    } catch {
        return date.toLocaleString();
    }
}

// Sort servers by player count descending
const sortedServers = computed(() => {
    return [...props.servers].sort((a, b) => {
        const countA = a.playerCount ?? -1;
        const countB = b.playerCount ?? -1;
        return countB - countA;
    });
});

// Dynamic columns calculation: 18 items per column
const columnCount = computed(() => {
    const len = sortedServers.value.length;
    if (len <= 18) return 1;
    if (len <= 36) return 2;
    if (len <= 54) return 3;
    return 4;
});

const tooltipStyle = computed(() => {
    const cols = columnCount.value;
    const estimatedWidth = cols * 200 + 24;
    const maxRows = Math.min(sortedServers.value.length, 18);
    const estimatedHeight = Math.min(maxRows * 22 + 45, window.innerHeight - 40);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const offset = 18;

    let left = props.x + offset;
    let top = props.y - 20;

    if (left + estimatedWidth > vw - 15) {
        left = props.x - estimatedWidth - offset;
    }
    if (left < 10) {
        left = 10;
    }

    if (top + estimatedHeight > vh - 15) {
        top = Math.max(10, vh - estimatedHeight - 15);
    }
    if (top < 10) {
        top = 10;
    }

    return {
        left: `${left}px`,
        top: `${top}px`,
        '--col-count': cols.toString(),
    };
});
</script>

<template>
    <div 
        v-if="visible && servers.length > 0" 
        class="mc-popover"
        :style="tooltipStyle"
    >
        <div class="popover-date">
            {{ formatDate(timestamp) }} ({{ sortedServers.length }} serveurs)
        </div>

        <div class="popover-grid" :class="`cols-${columnCount}`">
            <div 
                v-for="server in sortedServers" 
                :key="server.ip"
                class="popover-item"
            >
                <span 
                    class="server-color-bullet" 
                    :style="{ backgroundColor: server.color }"
                ></span>
                <span class="server-name" :title="server.name">{{ server.name }}</span>
                <span class="colon">:</span>
                <span class="player-count">{{ formatNumber(server.playerCount) }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.mc-popover {
    position: fixed;
    z-index: 2000;
    background: rgba(12, 12, 12, 0.95);
    border: 2px solid #555555;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9);
    padding: 8px 12px;
    pointer-events: none;
    user-select: none;
    font-family: minecraftio, sans-serif;
    color: #ffffff;
    max-height: 88vh;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #555 #000;
}

.popover-date {
    font-size: 12px;
    color: #94a3b8;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid #333;
}

.popover-grid {
    display: grid;
    gap: 2px 14px;
}

.popover-grid.cols-1 {
    grid-template-columns: 1fr;
}

.popover-grid.cols-2 {
    grid-template-columns: repeat(2, 190px);
}

.popover-grid.cols-3 {
    grid-template-columns: repeat(3, 190px);
}

.popover-grid.cols-4 {
    grid-template-columns: repeat(4, 185px);
}

.popover-item {
    display: flex;
    align-items: center;
    font-size: 12px;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
}

.server-color-bullet {
    width: 8px;
    height: 8px;
    border-radius: 1px;
    margin-right: 6px;
    flex-shrink: 0;
}

.server-name {
    font-weight: bold;
    color: #ffffff;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 2px;
}

.colon {
    color: #888888;
    margin-right: 4px;
}

.player-count {
    color: #fc9802;
    margin-left: auto;
    padding-left: 4px;
    font-weight: bold;
}
</style>
