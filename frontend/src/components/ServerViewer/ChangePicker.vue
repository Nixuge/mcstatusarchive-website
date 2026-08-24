<script setup lang="ts">
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
// Using the datepicker's css & classes to have a consistent styling
import '@vuepic/vue-datepicker/dist/main.css'

import { useChangeKey } from '@/stores/serverviewer/changekey';
import { useSnapshots } from '@/stores/serverviewer/snapshots';

const { setCurrentKey } = useChangeKey();
const { isJava, isBedrock } = storeToRefs(useSnapshots());

const selected = ref('all');
watch(selected, () => {
    setCurrentKey(selected.value);
})
</script>

<template>
    <div class="owo dp__theme_dark dp__main dp__input">
        <select v-model="selected" class="selector">
            <option value="all">All</option>
            <option value="players_on">Online Players</option>
            <option value="players_max">Max Players</option>
            <option value="ping">Ping</option>
            
            <!-- Java Specific Options -->
            <template v-if="isJava">
                <option value="players_sample">Player sample</option>
                <option value="favicon">Favicon</option>
                <option value="enforces_secure_chat">Secure Chat</option>
                <option value="forge_fml_network_version">Forge Network Version</option>
                <option value="forge_truncated">Forge Truncated</option>
                <option value="forge_channels">Forge Channels</option>
                <option value="forge_mods">Forge Mods</option>
            </template>
            
            <option value="version_protocol">Version Protocol</option>
            <option value="version_name">Version Name</option>
            <option value="motd">MOTD</option>
            
            <!-- Bedrock Specific Options -->
            <template v-if="isBedrock">
                <option value="version_brand">Version Brand</option>
                <option value="gamemode">Gamemode</option>
                <option value="map">Map</option>
            </template>
        </select>
    </div>
</template>

<style scoped>
    .owo {
        width: 100%;
        cursor: pointer;
    }
    .selector {
        width: 100%;
        background: transparent;
        color: #fff;
        border: 0;
    }
</style>