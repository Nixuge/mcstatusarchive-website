<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useGraphStore } from '@/stores/graph';

const props = defineProps<{
    isOpen: boolean;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'hoverPicker'): void;
}>();

const graphStore = useGraphStore();
const dropdownRef = ref<HTMLElement | null>(null);
const scrollContainerRef = ref<HTMLElement | null>(null);


// Virtual scrolling configuration
const ROW_HEIGHT = 44;
const VIEWPORT_HEIGHT = 400;
const scrollTop = ref(0);

function onScroll(e: Event) {
    scrollTop.value = (e.target as HTMLElement).scrollTop;
}

watch(() => [graphStore.searchFilter, graphStore.isRegexEnabled, props.isOpen], () => {
    scrollTop.value = 0;
    if (scrollContainerRef.value) {
        scrollContainerRef.value.scrollTop = 0;
    }
});

const totalItems = computed(() => graphStore.filteredServers.length);
const totalHeight = computed(() => totalItems.value * ROW_HEIGHT);

const startIndex = computed(() => {
    return Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - 4);
});

const endIndex = computed(() => {
    return Math.min(totalItems.value, startIndex.value + Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + 8);
});

const visibleServers = computed(() => {
    return graphStore.filteredServers.slice(startIndex.value, endIndex.value);
});

const offsetY = computed(() => {
    return startIndex.value * ROW_HEIGHT;
});

const selectedCount = computed(() => graphStore.selectedServerIps.length);
const isMaxReached = computed(() => selectedCount.value >= 500);

function toggleServer(ip: string) {
    graphStore.toggleServer(ip);
}

function selectTop(n: number) {
    graphStore.selectTop(n);
}

function clearAll() {
    graphStore.clearAllSelected();
}

function formatNumber(num: number | undefined | null) {
    if (num === undefined || num === null) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function extractCleanVersion(versionName: string | undefined): string {
    if (!versionName) return '';
    const match = versionName.match(/\b(1\.\d{1,2}(?:\.\d{1,2})?|\d{2}\.\d)\b/);
    if (match) return match[1];
    if (versionName.length <= 10) return versionName.trim();
    return versionName.substring(0, 10).trim();
}

function handleClickOutside(e: MouseEvent) {
    if (props.isOpen && dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
        emit('close');
    }
}

onMounted(() => {
    window.addEventListener('click', handleClickOutside, true);
});

onUnmounted(() => {
    window.removeEventListener('click', handleClickOutside, true);
});
</script>

<template>
    <div 
        v-if="isOpen" 
        ref="dropdownRef" 
        class="server-picker-mc" 
        @click.stop
        @mouseenter="$emit('hoverPicker')"
        @mousemove="$emit('hoverPicker')"
    >
        <div class="picker-header">
            <div class="header-row">
                <span class="picker-title">SERVEURS SÉLECTIONNÉS</span>
                <span class="picker-counter" :class="{ 'counter-max': isMaxReached }">
                    {{ selectedCount }} / 500
                </span>
            </div>
            <div v-if="isMaxReached" class="max-notice">
                Limite maximale de 500 serveurs atteinte
            </div>
        </div>

        <div class="search-row">
            <div class="search-input-wrapper">
                <input 
                    type="text" 
                    :value="graphStore.searchFilter"
                    @input="graphStore.setSearchFilter(($event.target as HTMLInputElement).value)"
                    placeholder="Rechercher par nom, IP, motd..." 
                    class="mc-search-input"
                />
                <button 
                    type="button"
                    class="regex-toggle-btn"
                    :class="{ active: graphStore.isRegexEnabled }"
                    @click.stop="graphStore.toggleRegex"
                    @mousedown.stop
                    title="Toggle Regex Search [.*]"
                >
                    [.*]
                </button>
            </div>
        </div>

        <div class="presets-row">
            <button type="button" class="mc-btn-small" @click.stop="selectTop(10)">Top 10</button>
            <button type="button" class="mc-btn-small" @click.stop="selectTop(25)">Top 25</button>
            <button type="button" class="mc-btn-small" @click.stop="selectTop(50)">Top 50</button>
            <button type="button" class="mc-btn-small" @click.stop="selectTop(100)">Top 100</button>
            <button type="button" class="mc-btn-small clear-btn" @click.stop="clearAll">Tout effacer</button>
        </div>

        <div ref="scrollContainerRef" class="server-list-viewport" @scroll="onScroll">
            <div v-if="totalItems > 0" class="virtual-scroll-spacer" :style="{ height: totalHeight + 'px' }">
                <div class="virtual-scroll-content" :style="{ transform: `translateY(${offsetY}px)` }">
                    <div 
                        v-for="server in visibleServers" 
                        :key="server.ip"
                        class="server-item"
                        :class="{ selected: graphStore.selectedServerIps.includes(server.ip) }"
                        @click="toggleServer(server.ip)"
                    >
                        <div class="item-left">
                            <input 
                                type="checkbox" 
                                :checked="graphStore.selectedServerIps.includes(server.ip)"
                                :disabled="!graphStore.selectedServerIps.includes(server.ip) && isMaxReached"
                                class="mc-checkbox"
                                @click.stop="toggleServer(server.ip)"
                            />
                            <div 
                                class="server-color-badge"
                                :style="{
                                    backgroundColor: graphStore.serverColors[server.ip] || '#555'
                                }"
                            ></div>
                            <div class="server-details">
                                <div class="name-line">
                                    <span class="server-name-text">{{ server.name || server.ip }}</span>
                                    <span v-if="server.version_name" class="version-badge" :title="server.version_name">
                                        {{ extractCleanVersion(server.version_name) }}
                                    </span>
                                </div>
                                <span v-if="server.name && server.name !== server.ip" class="server-ip-text">{{ server.ip }}</span>
                            </div>
                        </div>

                        <div class="item-right">
                            <span v-if="server.type === 1" class="tag-bedrock" title="Bedrock Edition">BE</span>
                            <span 
                                v-if="server.forge_fml_network_version !== undefined && server.forge_fml_network_version !== null && server.forge_fml_network_version !== -1" 
                                class="tag-forge" 
                                title="Forge Server"
                            >
                                Forge
                            </span>
                            <span class="player-count-value">
                                {{ formatNumber(server.players_on) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div v-else class="no-servers">
                Aucun serveur correspondant ({{ graphStore.serverList.length }} au total)
            </div>
        </div>
    </div>
</template>

<style scoped>
.server-picker-mc {
    position: absolute;
    top: 44px;
    right: 0;
    width: 440px;
    max-width: 95vw;
    background: #111111;
    border: 2px solid #6f6f6f;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.9);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    color: #ffffff;
    font-family: minecraftio, sans-serif;
    animation: slideDown 0.12s ease-out;
}

@keyframes slideDown {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
}

.picker-header {
    padding: 10px 14px 6px;
    background: #1a1a1a;
    border-bottom: 1px solid #333;
}

.header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.picker-title {
    font-size: 13px;
    color: #c0c0c0;
    font-weight: bold;
}

.picker-counter {
    background: #000;
    border: 1px solid #6f6f6f;
    padding: 2px 8px;
    font-size: 12px;
    color: #38bdf8;
}

.picker-counter.counter-max {
    color: #ef4444;
    border-color: #ef4444;
}

.max-notice {
    margin-top: 4px;
    font-size: 11px;
    color: #ef4444;
}

.search-row {
    padding: 8px 12px;
    background: #161616;
}

.search-input-wrapper {
    display: flex;
    align-items: center;
    background: #000;
    border: 1px solid #6f6f6f;
}

.mc-search-input {
    flex: 1;
    background: transparent;
    border: none;
    padding: 6px 10px;
    color: #fff;
    font-size: 13px;
    font-family: minecraftio, sans-serif;
    outline: none;
}

.regex-toggle-btn {
    background: #242424;
    border: none;
    border-left: 1px solid #444;
    color: #888;
    padding: 6px 10px;
    font-size: 13px;
    font-weight: bold;
    cursor: pointer;
    font-family: monospace;
    transition: all 0.15s;
    user-select: none;
}

.regex-toggle-btn:hover {
    color: #fff;
    background: #333;
}

.regex-toggle-btn.active {
    background: #15803d;
    color: #ffffff;
}

.presets-row {
    display: flex;
    gap: 5px;
    padding: 6px 12px 8px;
    background: #161616;
    border-bottom: 1px solid #333;
}

.mc-btn-small {
    flex: 1;
    background: #222;
    border: 1px solid #555;
    color: #ddd;
    padding: 4px 6px;
    font-size: 11px;
    cursor: pointer;
    font-family: minecraftio, sans-serif;
    transition: all 0.1s;
}

.mc-btn-small:hover {
    background: #333;
    border-color: #888;
    color: #fff;
}

.mc-btn-small.clear-btn {
    color: #f87171;
    border-color: #7f1d1d;
}

.mc-btn-small.clear-btn:hover {
    background: #450a0a;
    border-color: #ef4444;
    color: #fff;
}

.server-list-viewport {
    height: 400px;
    max-height: 400px;
    overflow-y: auto;
    scrollbar-color: #6f6f6f #000;
    scrollbar-width: thin;
    background: #0d0d0d;
    position: relative;
}

.virtual-scroll-spacer {
    width: 100%;
    position: relative;
}

.virtual-scroll-content {
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
}

.server-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 44px;
    padding: 0 12px;
    border-bottom: 1px solid #1a1a1a;
    cursor: pointer;
    box-sizing: border-box;
    transition: background-color 0.1s;
}

.server-item:hover {
    background: #1f1f1f;
}

.server-item.selected {
    background: #1a2332;
    border-left: 3px solid #0284c7;
}

.item-left {
    display: flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;
}

.mc-checkbox {
    cursor: pointer;
    accent-color: #fc9802;
    width: 15px;
    height: 15px;
}

.server-color-badge {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    flex-shrink: 0;
}

.server-details {
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.name-line {
    display: flex;
    align-items: center;
    gap: 6px;
}

.server-name-text {
    font-size: 13px;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.version-badge {
    background: #27272a;
    color: #a1a1aa;
    border: 1px solid #3f3f46;
    padding: 1px 5px;
    font-size: 10px;
    border-radius: 3px;
    flex-shrink: 0;
}

.server-ip-text {
    font-size: 11px;
    color: #71717a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.item-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
}

.tag-bedrock {
    background: #047857;
    color: #fff;
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 2px;
}

.tag-forge {
    background: #c2410c;
    color: #fff;
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 2px;
}

.player-count-value {
    font-size: 13px;
    color: #fc9802;
    min-width: 42px;
    text-align: right;
}

.no-servers {
    padding: 30px;
    text-align: center;
    color: #71717a;
    font-size: 13px;
}
</style>
