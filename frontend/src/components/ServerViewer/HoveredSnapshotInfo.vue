<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useSnapshots } from '@/stores/serverviewer/snapshots';
import { parseMotd } from '@/ts/utils/motd';
import { unixToDate } from '@/ts/utils/date';
import { API_URL } from '@/constants';

const { getHoveredSnapshot, getLatestServerSnapshotFull } = useSnapshots();

const activeSnapshot = computed(() => {
    const hovered = getHoveredSnapshot();
    if (hovered && hovered.save_time) {
        return { snapshot: hovered, isHovered: true };
    }
    const latest = getLatestServerSnapshotFull();
    return { snapshot: latest, isHovered: false };
});

const motdHtml = computed(() => {
    const snap = activeSnapshot.value.snapshot;
    if (!snap || !snap.motd) return "MOTD: N/A";
    return parseMotd(snap.motd, "Unknown MOTD");
});

const playerSampleList = computed(() => {
    const snap = activeSnapshot.value.snapshot;
    if (!snap || !snap.players_sample) return [];
    
    const raw = snap.players_sample;
    if (Array.isArray(raw)) {
        return raw.map(p => (typeof p === 'object' && p.name) ? p.name : String(p));
    }
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.map(p => (typeof p === 'object' && p.name) ? p.name : String(p));
            }
        } catch (e) {
            if (raw !== "[]" && raw !== "None") {
                return [raw];
            }
        }
    }
    return [];
});

const formattedDate = computed(() => {
    const snap = activeSnapshot.value.snapshot;
    if (!snap || !snap.save_time) return "N/A";
    return unixToDate(snap.save_time).toLocaleString();
});
</script>

<template>
    <div class="hovered_snapshot_container">
        <div class="header_bar">
            <h3>
                <span class="badge" :class="{'is_hover': activeSnapshot.isHovered}">
                    {{ activeSnapshot.isHovered ? 'HOVERED SNAPSHOT' : 'LATEST SNAPSHOT' }}
                </span>
                <span class="time_label" v-if="activeSnapshot.snapshot?.save_time">
                    Recorded at {{ formattedDate }} (Unix: {{ activeSnapshot.snapshot.save_time }})
                </span>
            </h3>
        </div>

        <div class="details_grid">
            <div class="card icon_card" v-if="activeSnapshot.snapshot?.favicon">
                <img class="favicon" :src="activeSnapshot.snapshot.favicon.startsWith('data:') || activeSnapshot.snapshot.favicon.startsWith('http') ? activeSnapshot.snapshot.favicon : `${API_URL}/static/favicons/${activeSnapshot.snapshot.favicon[0]}/${activeSnapshot.snapshot.favicon}.png`" alt="Favicon">
            </div>

            <div class="card stats_card">
                <div class="stat_item">
                    <span class="stat_label">Players:</span>
                    <span class="stat_value highlight">{{ activeSnapshot.snapshot?.players_on ?? 'N/A' }} / {{ activeSnapshot.snapshot?.players_max ?? 'N/A' }}</span>
                </div>
                <div class="stat_item">
                    <span class="stat_label">Ping (DE):</span>
                    <span class="stat_value">{{ activeSnapshot.snapshot?.ping !== undefined ? activeSnapshot.snapshot.ping + ' ms' : 'N/A' }}</span>
                </div>
                <div class="stat_item">
                    <span class="stat_label">Version:</span>
                    <span class="stat_value">{{ activeSnapshot.snapshot?.version_name || 'Unknown' }} ({{ activeSnapshot.snapshot?.version_protocol || 'N/A' }})</span>
                </div>
                <div class="stat_item" v-if="activeSnapshot.snapshot?.version_brand">
                    <span class="stat_label">Brand:</span>
                    <span class="stat_value">{{ activeSnapshot.snapshot.version_brand }}</span>
                </div>
                <div class="stat_item" v-if="activeSnapshot.snapshot?.gamemode">
                    <span class="stat_label">Gamemode:</span>
                    <span class="stat_value">{{ activeSnapshot.snapshot.gamemode }}</span>
                </div>
                <div class="stat_item" v-if="activeSnapshot.snapshot?.map">
                    <span class="stat_label">Map:</span>
                    <span class="stat_value">{{ activeSnapshot.snapshot.map }}</span>
                </div>
            </div>

            <div class="card motd_card">
                <span class="card_title">MOTD</span>
                <div class="motd_content" v-html="motdHtml"></div>
            </div>

            <div class="card sample_card" v-if="playerSampleList.length > 0">
                <span class="card_title">Online Players Sample ({{ playerSampleList.length }})</span>
                <div class="player_pills">
                    <span v-for="(pname, idx) in playerSampleList" :key="idx" class="player_pill">
                        {{ pname }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.hovered_snapshot_container {
    width: 90%;
    margin: 15px auto 25px auto;
    background-color: rgba(0, 0, 0, 0.4);
    border: 1px solid #444;
    border-radius: 4px;
    padding: 12px 18px;
    text-align: left;
    box-sizing: border-box;
}

.header_bar h3 {
    margin: 0 0 10px 0;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 10px;
}

.badge {
    background-color: #555;
    color: #fff;
    font-size: 0.75rem;
    padding: 2px 6px;
    border-radius: 3px;
    letter-spacing: 0.5px;
}

.badge.is_hover {
    background-color: #fc9802;
    color: #000;
    font-weight: bold;
}

.time_label {
    color: #ccc;
    font-size: 0.85rem;
    font-weight: normal;
}

.details_grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: stretch;
}

.card {
    background-color: rgba(20, 20, 20, 0.6);
    border: 1px solid #333;
    padding: 10px 14px;
    border-radius: 3px;
    flex: 1 1 auto;
    min-width: 160px;
}

.icon_card {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 64px;
}

.favicon {
    width: 64px;
    height: 64px;
    image-rendering: pixelated;
}

.card_title {
    font-size: 0.75rem;
    color: #888;
    text-transform: uppercase;
    display: block;
    margin-bottom: 6px;
}

.stat_item {
    font-size: 0.85rem;
    margin-bottom: 4px;
}

.stat_label {
    color: #888;
    margin-right: 6px;
}

.stat_value {
    color: #eee;
}

.stat_value.highlight {
    color: #fc9802;
    font-weight: bold;
}

.motd_content {
    font-size: 0.9rem;
    line-height: 1.4;
    color: #fff;
}

.player_pills {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    max-height: 100px;
    overflow-y: auto;
}

.player_pill {
    background-color: #2a2a2a;
    border: 1px solid #444;
    color: #679DEB;
    font-size: 0.8rem;
    padding: 2px 6px;
    border-radius: 3px;
}
</style>
