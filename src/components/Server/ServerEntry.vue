<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  ip: string,
  online_playerss: number,
  max_players: number,
  motd: string,
  icon?: string,
  name?: string,
  bar?: number
}>()

const arrow_clear = "https://i.imgur.com/88gxl6q.png";
const arrow_hovering = "https://i.imgur.com/tyZ4PV3.png";

const hovering_global = ref(false);
const hovering_arrow = ref(false);
const clicked = ref(false);
</script>

<template>
<div class="server_entry" :class="{'clicked': clicked}" @dblclick="$router.push('/server/' + ip)" @click="clicked = true" @mouseenter="hovering_global = true" @mouseleave="hovering_global = false">
    <div class="icon_wrapper">
        <img class="server_icon" :src="icon ? icon : 'https://s.namemc.com/i/7532417c54983749.png'">
        <img v-if="hovering_global" class="server_arrow" :src="hovering_arrow ? arrow_hovering : arrow_clear" @click.stop="$router.push('/server/' + ip)" @mouseenter="hovering_arrow = true" @mouseleave="hovering_arrow = false">
    </div>
    <div class="server_info">
        <div class="first_line">
            <img class="server_flag emoji" title="Hünenberg, Switzerland" draggable="false" src="https://s.namemc.com/img/emoji/twitter/1f1e8-1f1ed.svg" alt="🇨🇭">
            <span class="server_name">{{ name ? name : ip }}</span>
            
            <img class="ping" width="16" height="12" src="https://i.imgur.com/9eP3jKW.png">
            <span class="player_count">{{ online_playerss }}/{{ max_players }}</span>
        </div>
        <div class="server_motd">
            <span>TODO...</span>
        </div>

        </div>


  </div>
</template>

<style scoped>
::selection {
    color: #fff;
    background-color: #333;
}
.server_entry {
    height: 70px;
    /* background-color: #0F0F0F; */
    /* max-height: 90px; */
    border: 1px solid transparent;
}
.clicked {
    border: 1px solid #808080;
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
.server_info {
    /* padding: 2px; */
}
.icon_wrapper {
    position: relative;
    float: left;
    padding: 2px;
    width: 72px;
    height: 72px;
}
.server_arrow {
    position: absolute;
    top: 10px;
    left: 30px;
    width: 36px;
    height: 52px;
    cursor: pointer;
}
img.emoji {
  height: 1.05em;
  width: 1.05em;
  margin: 0 .15em;
  vertical-align: -.15em;
}
</style>