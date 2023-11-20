<script setup lang="ts">
import { onMounted, ref, watch, type Ref } from 'vue';
// Using the datepicker's css & classes to have a consistent styling
import '@vuepic/vue-datepicker/dist/main.css'

import { useChangeKey } from '@/stores/serverviewer/changekey';
const { setCurrentKey } = useChangeKey();

const selected = ref('all');
// const keys = ["All", "players_on", "players_max", "ping", "players_sample", "version_protocol", "version_name", "motd"]
watch(selected, () => {
    setCurrentKey(selected.value);
})

onMounted(() => {

})
</script>

<template>
    <div class="owo dp__theme_dark dp__main dp__input">
        <select v-model="selected" class="selector">
            <option value="all">All</option>
            <option value="players_on">Online Players</option>
            <option value="players_max">Max Players</option>
            <option value="ping">Ping</option>
            <option value="players_sample">Player sample</option>
            <option value="version_protocol">Version Protocol</option>
            <option value="version_name">Version Name</option>
            <option value="motd">MOTD</option>
            <!-- <option v-for="key of keys" :value="key">{{ key }}</option> -->
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