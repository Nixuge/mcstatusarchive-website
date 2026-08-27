<script setup lang="ts">
import { useRouter } from 'vue-router';

defineProps<{
    title?: string;
    direction?: 'slide-left' | 'slide-right';
}>();

const router = useRouter();

function goBack() {
    router.push('/');
}
</script>

<template>
    <header class="mc-graph-header">
        <span id="goback" @click="goBack">&lt; back</span>
        <div class="header-center">
            <Transition :name="direction || 'slide-left'">
                <h1 :key="title">{{ title || 'Multi-Server Player Count Graph' }}</h1>
            </Transition>
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
    overflow: hidden;
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

.header-center {
    position: relative;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.header-center h1 {
    position: absolute;
    font-size: 24px;
    color: #ffffff;
    margin: 0;
    font-weight: normal;
    text-shadow: 2px 2px 0px #000;
    white-space: nowrap;
}

/* Title Slide Transitions */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
    transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease;
}

.slide-left-enter-from {
    transform: translateX(100%);
    opacity: 0;
}

.slide-left-leave-to {
    transform: translateX(-100%);
    opacity: 0;
}

.slide-right-enter-from {
    transform: translateX(-100%);
    opacity: 0;
}

.slide-right-leave-to {
    transform: translateX(100%);
    opacity: 0;
}
</style>
