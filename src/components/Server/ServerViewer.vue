<script setup lang="ts">
import ServerEntry from './ServerEntry.vue';

const background_vanilla = "https://i.imgur.com/F4HCSWp.png";
const background_mathox = "https://i.imgur.com/WQK7qti.png";
</script>

<template>
    <h3>Play multiplayer</h3>
    <div class="server_viewer_wrapper">
        <div class="server_viewer">
        <ServerEntry ip="hypixel.net" :online_playerss="12" :max_players="20" motd="hello"/>
        <ServerEntry ip="hypixel.org" :online_playerss="12" :max_players="20" motd="hello"/>
        <ServerEntry ip="hypixel.suuuu" :online_playerss="12" :max_players="20" motd="hello"/>
        <ServerEntry ip="hypixel.oe" :online_playerss="12" :max_players="20" motd="hello"/>
    </div>
    <div id="scanning">
        <h4>Scanning for games on your local network</h4>
        <img id="scanning_gif" src="https://i.imgur.com/cfYkOU1.gif">
    </div>
    </div>
</template>

<style scoped>
h3 {
    text-align: center;
}

#scanning {
    margin-top:auto;
    margin-bottom:auto;
    text-align:center;
}
#scanning_gif {
    width: 50px;
    height: 14px;
}
 
    .server_viewer_wrapper {
        height: 90%;
        overflow: auto;
        /* shadows at top & botomp like in normal mc*/
        box-shadow: inset 0px 10px 5px -8px black, inset 0px -10px 5px -8px black;
        padding-left: 2rem;
        padding-right: 2rem;
        padding-top: 5px;
        padding-bottom: 5px;
        background: url("https://i.imgur.com/qiF5wSO.png");
        /* background: url("https://i.imgur.com/BuhwdPB.png"); */
        background-repeat: repeat;

        /* Firefox scrollbar */
        scrollbar-color: #c0c0c0 #000;
        scrollbar-width: large;
    }
    .server_viewer {
        display: grid;

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