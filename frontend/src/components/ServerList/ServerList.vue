<script setup lang="ts">
import { onMounted, ref, computed, type Ref } from 'vue';
import ServerEntry from './ServerEntry.vue';
import NumberInput from '@/components/utils/NumberInput.vue';
import CustomCheckbox from '@/components/utils/CustomCheckbox.vue';

import { useSearcher } from '@/stores/searcher';
const { setSearchText, searchInputMount, setMaxPing, setMinPlayerCount, setOrder, setOrderDescending, setServerType, setModdedFilter } = useSearcher();
function setSearch(payload: any) {
    setSearchText(payload.target.value);
}
function setOrderWrap(payload: any) {
    setOrder(payload.target.value);
}
function setServerTypeWrap(payload: any) {
    setServerType(payload.target.value);
}
function setModdedFilterWrap(payload: any) {
    setModdedFilter(payload.target.value);
}

import { useServerList } from '@/stores/serverlist';
const { requestServerList, getShownServerList } = useServerList()

const searchInput = ref(null) as unknown as Ref<HTMLInputElement>;
const wrapperRef = ref<HTMLElement | null>(null);

// Virtual scrolling for instant rendering and 0ms lag
const ROW_HEIGHT = 72;
const scrollTop = ref(0);

function onScroll(e: Event) {
    scrollTop.value = (e.target as HTMLElement).scrollTop;
}

const totalList = computed(() => getShownServerList());
const totalCount = computed(() => totalList.value.length);
const totalHeight = computed(() => totalCount.value * ROW_HEIGHT);

const startIndex = computed(() => {
    return Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - 5);
});

const endIndex = computed(() => {
    const visibleCount = Math.ceil((wrapperRef.value?.clientHeight || 800) / ROW_HEIGHT);
    return Math.min(totalCount.value, startIndex.value + visibleCount + 10);
});

const visibleServers = computed(() => {
    return totalList.value.slice(startIndex.value, endIndex.value);
});

const offsetY = computed(() => {
    return startIndex.value * ROW_HEIGHT;
});

onMounted(() => {
    requestServerList();
    searchInputMount(searchInput.value);
})
</script>

<template>
    <div class="server-list-page">
        <div class="header-container">
            <h3>Play multiplayer ({{ totalCount }} servers available)</h3>
            <button class="graph-nav-btn" @click="$router.push('/graph')" title="Voir le graphique multi-serveurs">
                📈 Graphique Joueurs
            </button>
        </div>
        <div ref="wrapperRef" class="server_viewer_wrapper" @scroll="onScroll">
            <div class="virtual_spacer" :style="{ height: totalHeight + 'px' }">
                <div class="virtual_content" :style="{ transform: `translateY(${offsetY}px)` }">
                    <div class="server_viewer">
                        <ServerEntry v-for="server in visibleServers" :key="server.ip" :data="server" />
                    </div>
                </div>
            </div>
            <div id="scanning">
                <h4>Scanning for games on your local network</h4>
                <img id="scanning_gif" src="https://i.imgur.com/cfYkOU1.gif">
            </div>
        </div>
        <div class="footer">
            <select class="selector" @change="setServerTypeWrap">
                <option value="all">All</option>
                <option value="java">Java</option>
                <option value="bedrock">Bedrock</option>
            </select>
            <select class="selector" @change="setModdedFilterWrap">
                <option value="all">All (Vanilla/Forge)</option>
                <option value="vanilla">Vanilla</option>
                <option value="forge">Forge</option>
            </select>
            <NumberInput placeholder="Max ping" :step="10" :onChange="setMaxPing" :max="3000" fontSize="0.6rem"/>
            <NumberInput placeholder="Min players" :step="10" :onChange="setMinPlayerCount" :max="10000" fontSize="0.42rem"/>
            <input id="searchText" ref="searchInput" @input="setSearch">
            <select class="selector" @change="setOrderWrap">
                <option value="alphabetical">Alphabetical</option>
                <option value="ping">Ping</option>
                <option value="playercount">Playercount</option>
            </select>
            <CustomCheckbox :onChange="setOrderDescending"/>
        </div>
    </div>
</template>

<style scoped>
.server-list-page {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
}

.footer {
    position: fixed;
    bottom: 0;
    width: 100%;
    background: url("https://i.imgur.com/BuhwdPB.png");
    text-align: center;
    overflow: hidden;
    white-space: nowrap;
    z-index: 10;
}

.selector,
#searchText {
    margin: 5px;
    max-width: 1100px;
    background-color: #000;
    color: #fff;
    border: 1px solid #6f6f6f;
    padding: 5px;
}

#searchText {
    width: 50%;
}
#searchText:focus-visible {
    outline: 0px solid #6f6f6f;
}

.header-container {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    padding-bottom: 5px;
    flex-shrink: 0;
}

h3 {
    text-align: center;
}

.graph-nav-btn {
    position: absolute;
    right: 2rem;
    background: #000000;
    color: #ffffff;
    border: 1px solid #6f6f6f;
    padding: 5px 14px;
    font-size: 13px;
    font-family: minecraftio, sans-serif;
    cursor: pointer;
    transition: all 0.1s;
}

.graph-nav-btn:hover {
    background: #242424;
    border-color: #fc9802;
    color: #fc9802;
}

#scanning {
    margin-top: 10px;
    margin-bottom: 40px;
    text-align: center;
}

#scanning_gif {
    width: 50px;
    height: 14px;
}

.server_viewer_wrapper {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    box-shadow: inset 0px 10px 5px -8px black, inset 0px -10px 5px -8px black;
    padding-left: 2rem;
    padding-right: 2rem;
    padding-top: 5px;
    padding-bottom: 40px;
    background: url("https://i.imgur.com/qiF5wSO.png");
    background-repeat: repeat;

    /* Firefox scrollbar */
    scrollbar-color: #c0c0c0 #000;
    scrollbar-width: large;
    width: 100%;
    position: relative;
    box-sizing: border-box;
}

.virtual_spacer {
    width: 100%;
    position: relative;
}

.virtual_content {
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
}

.server_viewer {
    display: grid;
    max-width: 1280px;
    margin: auto;
    grid-template-columns: 1fr;
    width: 100%;
}

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