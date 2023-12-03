<script setup lang="ts">
import { onMounted, ref, type Ref } from 'vue';
import ServerEntry from './ServerEntry.vue';
import NumberInput from '@/components/utils/NumberInput.vue';

import { useSearcher } from '@/stores/searcher';
const { setSearchText, searchInputMount, setMaxPing, setMinPlayerCount } = useSearcher();
function setSearch(payload: any) {
    setSearchText(payload.target.value);
}

import { useServerList } from '@/stores/serverlist';
const { requestServerList, getShownServerList } = useServerList()

const searchInput = ref(null) as unknown as Ref<HTMLInputElement>;

onMounted(() => {
    requestServerList();
    searchInputMount(searchInput.value);
})

</script>

<template>
    <h3>Play multiplayer ({{ getShownServerList().length }} servers available)</h3>
    <div class="server_viewer_wrapper">
        <div class="server_viewer">
            <ServerEntry  v-for="server in getShownServerList()" :key="server.ip" :data="server" />
        </div>
        <div id="scanning">
            <h4>Scanning for games on your local network</h4>
            <img id="scanning_gif" src="https://i.imgur.com/cfYkOU1.gif">
        </div>
    </div>
    <div class="footer">
        <NumberInput placeholder="Max ping" :step="10" :onChange="setMaxPing" :max="3000" fontSize="0.6rem"/>
        <input id="searchText" ref="searchInput" @input="setSearch">
        <NumberInput placeholder="Min players" :step="10" :onChange="setMinPlayerCount" :max="10000" fontSize="0.42rem"/>
    </div>
</template>

<style scoped>
.footer {
    /* "Overlay" on top of the main .server_viewer_wrapper (which has a height of 90%) */
    position: fixed;
    bottom: 0;
    width: 100%;
    background: url("https://i.imgur.com/BuhwdPB.png"); /* to also replace in main.css */
    text-align: center;
    overflow: hidden;
    white-space: nowrap;
}
#searchText {
    margin: 5px;
    width: 60%;
    max-width: 1100px;
    background-color: #000;
    color: #fff;
    border: 1px solid #6f6f6f;
    padding: 5px;
}
.footer input:focus-visible {
    /* outline: 1px solid #7b85bd; */
    outline: 0px solid #6f6f6f;
}
h3 {
    text-align: center;
    padding-bottom: 5px;
}

#scanning {
    margin-top: auto;
    margin-bottom: auto;
    text-align: center;
}

#scanning_gif {
    width: 50px;
    height: 14px;
}

.server_viewer_wrapper {
    height: 90%; /* Not 100% to avoid a weird slight scrolling otherwise */
    overflow: auto;
    /* shadows at top & botomp like in normal mc*/
    box-shadow: inset 0px 10px 5px -8px black, inset 0px -10px 5px -8px black;
    padding-left: 2rem;
    padding-right: 2rem;
    padding-top: 5px;
    padding-bottom: 5px;
    background: url("https://i.imgur.com/qiF5wSO.png");
    background-repeat: repeat;

    /* Firefox scrollbar */
    scrollbar-color: #c0c0c0 #000;
    scrollbar-width: large;
    width: 100%;
}

.server_viewer {
    display: grid;
    max-width: 1280px;
    margin: auto;
    grid-template-columns: 1fr;
    width: 100%;
}

/* TODO: see if possible to replace w a lib like simplebar for ff custom scrollbar support   */
::-webkit-scrollbar {
    width: 8px;
}

::-webkit-scrollbar-thumb {
    background-color: #c0c0c0;
    border-bottom: 1px solid #808080;
    border-right: 1px solid #808080;
}

::-webkit-scrollbar-track {
    background-color: #000;
}
</style>