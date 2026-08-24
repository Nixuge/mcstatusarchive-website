<script setup lang="ts">
import GraphNavbar from '@/components/Graph/GraphNavbar.vue';
import PlayerMultiGraph from '@/components/Graph/PlayerMultiGraph.vue';
</script>

<template>
    <div class="graph-page-container">
        <GraphNavbar />
        <main class="graph-main">
            <PlayerMultiGraph />
        </main>
    </div>
</template>

<style scoped>
.graph-page-container {
    width: 100%;
    min-height: 100%;
    background: url("https://i.imgur.com/BuhwdPB.png");
    background-repeat: repeat;
    font-family: minecraftio, sans-serif;
    color: #ffffff;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}

.graph-main {
    flex: 1;
    width: 100%;
    margin: 0 auto;
}
</style>
