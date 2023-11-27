<script setup lang="ts">
import { onMounted, ref, type Ref } from 'vue';
import { API_URL } from '@/constants';
import { useServerList, type Server } from '@/stores/serverlist';
import { parseMotd } from '@/ts/utils/motd';
const { getSelectedServer, changeSelectedServer } = useServerList()

const props = defineProps<{
    data: Server
}>();

const ip = props.data.ip;
const icon = props.data.favicon;
const name = undefined;
const online_players = props.data.players_on;
const max_players = props.data.players_max;

const motdRef: Ref<HTMLElement> = ref(null) as unknown as Ref<HTMLElement>;
const motd_formatted = parseMotd(props.data.motd)

onMounted(() => {
    motdRef.value.innerHTML = motd_formatted;
});
// const props = defineProps<{
//   ip: string,
//   online_playerss: number,
//   max_players: number,
//   motd: string,
//   icon?: string,
//   name?: string
// }>()

const ping = props.data.ping;
let pingSrc: string;
if (ping < 50) {
    pingSrc = "5"
} else if (ping < 100) {
    pingSrc = "4"
} else if (ping < 200) {
    pingSrc = "3"
} else if (ping < 300) {
    pingSrc = "2"
} else {
    pingSrc = "1"
}

const hovering_global = ref(false);
const hovering_arrow = ref(false);

function showVersionTemporary() {
    alert(
    "Ping: " + props.data.ping + 
    "\n\nVersion name: " + props.data.version_name + 
    "\nVersion protocol: " + props.data.version_protocol +
    "\n\n(Server pinged in 1.20.2, protocol version 764)"
    )
}
</script>

<template>
<div class="server_entry" :class="{'clicked': getSelectedServer() === ip}" @dblclick="$router.push('/server/' + ip)" @click="changeSelectedServer(ip)" @mouseenter="hovering_global = true" @mouseleave="hovering_global = false">
    <div class="icon_wrapper">
        <img class="server_icon" :class="{'hovering': hovering_global}" :src="icon != 'None' && icon != undefined ? `${API_URL}/static/favicons/${icon}.png` : `${API_URL}/static/server/unknown_server.png`">
        <img v-if="hovering_global" class="server_arrow" :src="hovering_arrow ? `${API_URL}/static/server/arrow_hover.png` : `${API_URL}/static/server/arrow.png`" @click.stop="$router.push('/server/' + ip)" @mouseenter="hovering_arrow = true" @mouseleave="hovering_arrow = false">
    </div>
    <div class="server_info">
        <div class="first_line">
            <span class="server_name">{{ name ? name : ip }}</span>
            
            <img class="ping" width="20" height="14" :src="`${API_URL}/static/ping/ping_${pingSrc}.png`" @click="showVersionTemporary">
            <span class="player_count" v-if="online_players !== undefined && max_players !== undefined">{{ online_players }}/{{ max_players }}</span>
        </div>
        <div class="server_motd" ref="motdRef"></div>
        </div>
  </div>
</template>

<style>
/* MOTD select 
Quite dirty but the lib uses styles, not classes,
and it's already compiled so can't really change it
*/
.server_motd > span::selection,
.server_motd > span > span::selection,
.server_motd > span > span > span::selection {
    color: #fff;
    background-color: #333;
}
</style>

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
    cursor: default;
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
    cursor: pointer;
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
    image-rendering: pixelated;
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