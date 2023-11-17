<script setup lang="ts">
import ServerEntry from './ServerEntry.vue';

const background_vanilla = "https://i.imgur.com/F4HCSWp.png";
const background_mathox = "https://i.imgur.com/WQK7qti.png";
</script>

<template>
    <h3>Play multiplayer</h3>
    <div class="server_viewer">
        <ServerEntry ip="hypixel.net" :online_playerss="12" :max_players="20" motd="hello"/>
    </div>
</template>

<style scoped>
h3 {
    text-align: center;
}
    .server_viewer {
        /* shadows at top & botomp like in normal mc*/
        box-shadow: inset 0px 10px 5px -8px black, inset 0px -10px 5px -8px black;
        padding-left: 2rem;
        padding-right: 2rem;
        padding-top: 5px;
        padding-bottom: 5px;
        width: 100%;
        background: url("https://i.imgur.com/qiF5wSO.png");
        /* background: url("https://i.imgur.com/BuhwdPB.png"); */
        background-repeat: repeat;
    }
</style>