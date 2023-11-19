<script setup lang="ts">
import { onMounted, ref, type Ref } from 'vue';
import { API_URL } from '@/constants';
import { useServerList, type Server } from '@/stores/serverlist';
const { getSelectedServer, changeSelectedServer } = useServerList()

const props = defineProps<{
    data: Server
}>();

const ip = props.data.ip;
const icon = props.data.favicon;
const name = undefined;
const online_players = props.data.players_on;
const max_players = props.data.players_max;

import { replaceColorCodes } from '@/js/MinecraftColorCodes'
const motd_formatted: DocumentFragment = (props.data.motd == null) ? 
        replaceColorCodes("§4Can't connect to server") : replaceColorCodes(props.data.motd);

const motdRef: Ref<HTMLElement> = ref(null) as unknown as Ref<HTMLElement>;

onMounted(() => {
        motdRef.value.appendChild(motd_formatted)
});
// const props = defineProps<{
//   ip: string,
//   online_playerss: number,
//   max_players: number,
//   motd: string,
//   icon?: string,
//   name?: string
// }>()

const arrow_clear = "https://i.imgur.com/88gxl6q.png";
const arrow_hovering = "https://i.imgur.com/tyZ4PV3.png";

const hovering_global = ref(false);
const hovering_arrow = ref(false);
</script>

<template>
<div class="server_entry" :class="{'clicked': getSelectedServer() === ip}" @dblclick="$router.push('/server/' + ip)" @click="changeSelectedServer(ip)" @mouseenter="hovering_global = true" @mouseleave="hovering_global = false">
    <div class="icon_wrapper">
        <img class="server_icon" :class="{'hovering': hovering_global}" :src="icon != 'None' && icon != undefined ? `${API_URL}/static/favicons/${icon}.png` : `${API_URL}/static/unknown_server.png`">
        <img v-if="hovering_global" class="server_arrow" :src="hovering_arrow ? arrow_hovering : arrow_clear" @click.stop="$router.push('/server/' + ip)" @mouseenter="hovering_arrow = true" @mouseleave="hovering_arrow = false">
    </div>
    <div class="server_info">
        <div class="first_line">
            <span class="server_name">{{ name ? name : ip }}</span>
            
            <img class="ping" width="16" height="12" src="https://i.imgur.com/9eP3jKW.png">
            <span class="player_count" v-if="online_players !== undefined && max_players !== undefined">{{ online_players }}/{{ max_players }}</span>
        </div>
        <div class="server_motd" ref="motdRef"></div>
        </div>
  </div>
</template>

<style scoped>
::selection {
    color: #fff;
    background-color: #333;
}
.server_entry {
    box-sizing: border-box;
    overflow-x: auto;
    height: 72px;
    border: 2px solid transparent;
    width: 100%;
}
.clicked {
    border: 2px solid #808080;
    background: #000;
}
.player_count,
.ping {
    float: right;
}
.ping {
    margin-top: 7px;
    margin-left: 5px;
}
.server_icon {
    width: 64px;
    height: 64px;
}
.server_icon.hovering {
    filter: grayscale(80%);
    background-color: #333;
}
.icon_wrapper {
    position: relative;
    float: left;
    margin: 2px;
    margin-right: 5px;
    width: 64px;
    height: 64px;
}
img {
    display: block;
}
.server_arrow {
    position: absolute;
    top: 6px;
    left: 24px;
    width: 36px;
    height: 52px;
    cursor: pointer;
    padding-bottom: 0px;
    margin-bottom: 0;
}
.server_motd {
    font-size: 13px;
}
/* img.emoji {
  height: 1.05em;
  width: 1.05em;
  margin: 0 .15em;
  vertical-align: -.15em;
} */
</style>