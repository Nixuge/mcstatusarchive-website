<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function goBack() {
    router.push('/');
}
</script>

<template>
    <header class="mc-graph-header">
        <span id="goback" @click="goBack">&lt; back</span>
        <div class="header-center">
            <h1>Multi-Server Player Count Graph</h1>
        </div>
    </header>
</template>

<style scoped>
.mc-graph-header {
    position: relative;
    width: 100%;
    text-align: center;
    padding-top: 6px;
    padding-bottom: 8px;
    font-family: minecraftio, sans-serif;
}

#goback {
    position: fixed;
    top: 0;
    left: 0;
    background-color: rgba(0, 0, 0, 0.4);
    border-bottom: 1px solid #555;
    border-right: 1px solid #555;
    padding: 4px 10px;
    cursor: pointer;
    font-size: 13px;
    color: #fff;
    z-index: 100;
    font-family: minecraftio, sans-serif;
    transition: background-color 0.15s;
}

#goback:hover {
    background-color: #242424;
    color: #fc9802;
}

.header-center h1 {
    font-size: 24px;
    color: #ffffff;
    margin: 0;
    font-weight: normal;
    text-shadow: 2px 2px 0px #000;
}
</style>
