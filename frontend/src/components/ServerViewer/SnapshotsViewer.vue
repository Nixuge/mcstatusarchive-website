<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useSnapshots } from '@/stores/serverviewer/snapshots';
import { useChangeKey } from '@/stores/serverviewer/changekey';
import { unixToDate } from '@/ts/utils/date';
import { parseMotd } from '@/ts/utils/motd';

const { getServerSnapshotsForDateRangeAndCategory, getSnapshotSearcher, setHoveredSnapshot, hoveredSnapshot } = useSnapshots();
const { getCurrentKey } = useChangeKey();

const categoryKey = computed(() => getCurrentKey());

// Timestamps list for current category
const timestamps = computed(() => getServerSnapshotsForDateRangeAndCategory());

// Pagination state
const limit = ref(50);

// Reset limit when timestamps or category changes
watch([timestamps, categoryKey], () => {
    limit.value = 50;
});

const visibleTimestamps = computed(() => {
    return timestamps.value.slice(0, limit.value);
});

const visibleSnapshots = computed(() => {
    const searcher = getSnapshotSearcher();
    if (!searcher) return [];
    return (visibleTimestamps.value as number[]).map(ts => {
        return searcher.grabLatestSnapshotData(ts);
    });
});

function loadMore() {
    if (limit.value < timestamps.value.length) {
        limit.value += 50;
    }
}

function handleScroll(e: Event) {
    const target = e.target as HTMLElement;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 150) {
        loadMore();
    }
}

// Check if a list has more items
const hasMore = computed(() => limit.value < timestamps.value.length);
</script>

<template>
    <div class="snapshots_section">
        <h2 class="section_title" v-if="categoryKey === 'all'">
            {{ timestamps.length }} snapshots taken in the selected time period.
        </h2>
        <h2 class="section_title" v-else>
            {{ timestamps.length }} changes in "{{ categoryKey }}" in the selected time period.
        </h2>

        <div v-if="timestamps.length === 0" class="no_data">
            No records found for this time period.
        </div>

        <div v-else class="list_container" @scroll="handleScroll">
            <div 
                v-for="snap in visibleSnapshots" 
                :key="snap.save_time" 
                class="snapshot_row" 
                :class="{'active': hoveredSnapshot?.save_time === snap.save_time}"
                @mouseenter="setHoveredSnapshot(snap)" 
                @mouseleave="setHoveredSnapshot(null)"
            >
                <div class="row_meta">
                    <span class="row_time">{{ unixToDate(snap.save_time).toLocaleString() }}</span>
                    <span class="row_unix">Unix: {{ snap.save_time }}</span>
                </div>
                
                <div class="row_value">
                    <!-- Dynamic rendering based on category key -->
                    <span v-if="categoryKey === 'all'" class="row_val_group">
                        <span class="pill players" v-if="snap.players_on !== undefined && snap.players_max !== undefined">Players: {{ snap.players_on }}/{{ snap.players_max }}</span>
                        <span class="pill ping" v-if="snap.ping !== undefined">Ping: {{ snap.ping }}ms</span>
                        <span class="val_text text_muted">{{ snap.version_name }}</span>
                    </span>
                    
                    <span v-else-if="categoryKey === 'players_on' || categoryKey === 'players_max'" class="row_val_group">
                        <span class="pill players">Players: {{ snap.players_on }}/{{ snap.players_max }}</span>
                    </span>
                    
                    <span v-else-if="categoryKey === 'ping'" class="row_val_group">
                        <span class="pill ping">Ping: {{ snap.ping }}ms</span>
                    </span>

                    <span v-else-if="categoryKey === 'motd'" class="row_val_group">
                        <span class="motd_preview" v-html="parseMotd(snap.motd, 'Unknown MOTD')"></span>
                    </span>

                    <span v-else-if="categoryKey === 'favicon'" class="row_val_group">
                        <img v-if="snap.favicon" class="row_favicon" :src="snap.favicon" alt="Favicon">
                        <span v-else class="text_muted">No Favicon</span>
                    </span>

                    <span v-else-if="categoryKey === 'players_sample'" class="row_val_group">
                        <span class="players_sample_preview">
                            <template v-if="snap.players_sample">
                                <span class="val_title">Players Sample:</span>
                                <span class="val_text">{{ snap.players_sample }}</span>
                            </template>
                            <span v-else class="text_muted">No Players Online</span>
                        </span>
                    </span>

                    <span v-else-if="categoryKey === 'enforces_secure_chat'" class="row_val_group">
                        <span class="pill secure" :class="{'enforced': snap.enforces_secure_chat === 1}">
                            Secure Chat: {{ snap.enforces_secure_chat === 1 ? 'Enforced' : 'Not Enforced' }}
                        </span>
                    </span>

                    <span v-else-if="categoryKey === 'forge_mods'" class="row_val_group">
                        <span class="val_preview">
                            <span class="val_title">Forge Mods:</span>
                            <span class="val_text">{{ snap.forge_mods || 'None' }}</span>
                        </span>
                    </span>

                    <span v-else-if="categoryKey === 'forge_channels'" class="row_val_group">
                        <span class="val_preview">
                            <span class="val_title">Forge Channels:</span>
                            <span class="val_text">{{ snap.forge_channels || 'None' }}</span>
                        </span>
                    </span>

                    <span v-else class="row_val_group">
                        <span class="val_title">{{ categoryKey }}:</span>
                        <span class="val_text highlight">{{ snap[categoryKey] ?? 'N/A' }}</span>
                    </span>
                </div>
            </div>
            
            <div v-if="hasMore" class="loading_indicator">
                Scrolling loads more ({{ timestamps.length - limit }} remaining)...
            </div>
        </div>
    </div>
</template>

<style scoped>
.snapshots_section {
    width: 90%;
    margin: 20px auto;
    text-align: left;
}

.section_title {
    font-size: 1.1rem;
    color: #eee;
    margin-bottom: 12px;
}

.no_data {
    background-color: rgba(20, 20, 20, 0.4);
    border: 1px dashed #444;
    padding: 20px;
    border-radius: 4px;
    text-align: center;
    color: #888;
}

.list_container {
    max-height: 400px;
    overflow-y: auto;
    background-color: rgba(10, 10, 10, 0.6);
    border: 1px solid #333;
    border-radius: 4px;
    padding: 5px;
    box-sizing: border-box;
    scrollbar-width: thin;
    scrollbar-color: #555 #222;
}

.list_container::-webkit-scrollbar {
    width: 6px;
}

.list_container::-webkit-scrollbar-thumb {
    background-color: #555;
    border-radius: 3px;
}

.snapshot_row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #222;
    border-radius: 3px;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;
}

.snapshot_row:last-child {
    border-bottom: none;
}

.snapshot_row:hover, .snapshot_row.active {
    background-color: rgba(252, 152, 2, 0.15);
    border-color: rgba(252, 152, 2, 0.3);
}

.row_meta {
    display: flex;
    flex-direction: column;
    min-width: 180px;
}

.row_time {
    font-size: 0.85rem;
    color: #ddd;
    font-weight: 500;
}

.row_unix {
    font-size: 0.7rem;
    color: #777;
    margin-top: 2px;
}

.row_value {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-grow: 1;
    justify-content: flex-end;
    font-size: 0.85rem;
    color: #eee;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.row_val_group {
    display: flex;
    align-items: center;
    gap: 10px;
}

.pill {
    font-size: 0.75rem;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: bold;
}

.pill.players {
    background-color: #223a5e;
    color: #679deb;
    border: 1px solid #3b5b8c;
}

.pill.ping {
    background-color: #293829;
    color: #88c088;
    border: 1px solid #3c543c;
}

.pill.secure {
    background-color: #3b2222;
    color: #eb6767;
    border: 1px solid #8c3b3b;
}

.pill.secure.enforced {
    background-color: #223822;
    color: #67eb67;
    border: 1px solid #3b8c3b;
}

.row_favicon {
    width: 24px;
    height: 24px;
    image-rendering: pixelated;
}

.motd_preview {
    font-size: 0.8rem;
    text-align: right;
    max-height: 24px;
    overflow: hidden;
}

.val_title {
    color: #888;
    margin-right: 5px;
    font-size: 0.8rem;
}

.val_text {
    color: #ddd;
}

.val_text.text_muted {
    color: #777;
}

.highlight {
    color: #fc9802;
    font-weight: bold;
}

.loading_indicator {
    text-align: center;
    padding: 10px;
    color: #666;
    font-size: 0.75rem;
    border-top: 1px dashed #333;
}
</style>