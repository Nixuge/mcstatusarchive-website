<script setup lang="ts">
import { useSnapshots } from '@/stores/serverviewer/snapshots';
import type { ServerSnapshot } from '@/ts/types/serversnapshot';
import { ref, watch, type Ref, onMounted } from 'vue';
import { replaceColorCodes } from '@/js/MinecraftColorCodes';

const { getLatestServerSnapshotFull } = useSnapshots();

const motdSpan = ref(null) as unknown as Ref<HTMLSpanElement>;
const versionNameSpan = ref(null) as unknown as Ref<HTMLSpanElement>;
    
const latestSnapshot = ref({
    save_time: 0,
    save_date: new Date(),
    motd: "",
    ping: "",
    players_max: "X",
    players_on: "X",
    version_name: "",
    version_protocol: "",
}) as unknown as Ref<ServerSnapshot>;
    
watch(getLatestServerSnapshotFull, () => {
    latestSnapshot.value = getLatestServerSnapshotFull();
    if (motdSpan.value)
        motdSpan.value.appendChild(replaceColorCodes(latestSnapshot.value.motd))   
    if (versionNameSpan.value)
        versionNameSpan.value.appendChild(replaceColorCodes(latestSnapshot.value.version_name))   
})

onMounted(() => {
    if (latestSnapshot.value) {
        versionNameSpan.value.appendChild(replaceColorCodes(latestSnapshot.value.version_name))
        motdSpan.value.appendChild(replaceColorCodes(latestSnapshot.value.motd))
    }
})
</script>

<template>
    <div class="flex-grid">
        <span class="b s">Players: {{ latestSnapshot.players_on }}/{{ latestSnapshot.players_max }}</span>
        <span class="b s">Ping (DE): {{ latestSnapshot.ping }}</span>
        <span class="b">Version Protocol: {{ latestSnapshot.version_protocol }}</span>

        <span class="s">Save time:<br>{{ latestSnapshot.save_time }} ({{ latestSnapshot.save_date.toLocaleString("fr") }})</span>
        <span class="s" ref="motdSpan">MOTD:<br></span>
        <span ref="versionNameSpan">Version name:<br></span>
    </div>
</template>

<style scoped>
/* span {
    font-size: 75%;
} */
.flex-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-around;
    padding-right: 50px;
    padding-left: 50px;
    margin-bottom: 5px;
}

.b {
    border-bottom: 1px solid #000;
}
.s {
    border-right: 1px solid #000;
}
.flex-grid > * {
    flex: 1 0 calc(33.33% - 20px);
    text-align: center;
    padding: 5px;
    
    box-sizing: border-box;
    background-color: rgba(0, 0, 0, 0.3);
}
</style>