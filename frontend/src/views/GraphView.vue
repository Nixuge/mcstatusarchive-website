<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import GraphNavbar from '@/components/Graph/GraphNavbar.vue';
import PlayerMultiGraph from '@/components/Graph/PlayerMultiGraph.vue';
import VersionPieChart from '@/components/Graph/VersionPieChart.vue';
import DomainPieChart from '@/components/Graph/DomainPieChart.vue';
import SecureChatPieChart from '@/components/Graph/SecureChatPieChart.vue';

const TOTAL_PAGES = 4;
const currentPage = ref(0);
const slideDirection = ref<'slide-left' | 'slide-right'>('slide-left');

const pageTitles = [
    'Multi-Server Player Count Graph',
    'Minecraft Version Distribution',
    'Server Domain Distribution',
    'Secure Chat Enforcement',
];

function nextPage() {
    slideDirection.value = 'slide-left';
    currentPage.value = (currentPage.value + 1) % TOTAL_PAGES;
}

function prevPage() {
    slideDirection.value = 'slide-right';
    currentPage.value = (currentPage.value - 1 + TOTAL_PAGES) % TOTAL_PAGES;
}

function goToPage(index: number) {
    if (index >= 0 && index < TOTAL_PAGES && index !== currentPage.value) {
        slideDirection.value = index > currentPage.value ? 'slide-left' : 'slide-right';
        currentPage.value = index;
    }
}

function handleKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
    }
    if (e.key === 'ArrowRight') {
        nextPage();
    } else if (e.key === 'ArrowLeft') {
        prevPage();
    }
}

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
    <div class="graph-page-container">
        <GraphNavbar :title="pageTitles[currentPage]" :direction="slideDirection" />

        <!-- Side Navigation Buttons -->
        <button
            class="carousel-nav-btn prev-btn"
            @click="prevPage"
            title="Previous Page"
            aria-label="Previous Page"
        >
            <span>&lt;</span>
        </button>

        <button
            class="carousel-nav-btn next-btn"
            @click="nextPage"
            title="Next Page"
            aria-label="Next Page"
        >
            <span>&gt;</span>
        </button>

        <!-- Carousel Viewport -->
        <main class="carousel-viewport">
            <Transition :name="slideDirection">
                <KeepAlive>
                    <div :key="currentPage" class="carousel-slide-full">
                        <!-- Page 1: Player Count Multi-Graph -->
                        <div v-if="currentPage === 0" class="slide-content">
                            <PlayerMultiGraph />
                        </div>

                        <!-- Page 2: Minecraft Version Distribution -->
                        <div v-else-if="currentPage === 1" class="slide-content">
                            <VersionPieChart />
                        </div>

                        <!-- Page 3: Server Domain Distribution -->
                        <div v-else-if="currentPage === 2" class="slide-content">
                            <DomainPieChart />
                        </div>

                        <!-- Page 4: Secure Chat Enforcement -->
                        <div v-else-if="currentPage === 3" class="slide-content">
                            <SecureChatPieChart />
                        </div>
                    </div>
                </KeepAlive>
            </Transition>
        </main>

        <!-- Page Indicator Dots -->
        <div class="carousel-indicators">
            <button
                v-for="i in TOTAL_PAGES"
                :key="i"
                class="indicator-dot"
                :class="{ 'active': currentPage === i - 1 }"
                @click="goToPage(i - 1)"
                :title="pageTitles[i - 1]"
            />
        </div>
    </div>
</template>

<style scoped>
.graph-page-container {
    position: relative;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    background: url("https://i.imgur.com/BuhwdPB.png");
    background-repeat: repeat;
    font-family: minecraftio, sans-serif;
    color: #ffffff;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}

.carousel-viewport {
    flex: 1;
    width: 100%;
    overflow: hidden;
    position: relative;
}

.carousel-slide-full {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
}

.slide-content {
    width: 100%;
    height: 100%;
    overflow: auto;
}

/* Directional Transitions */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
    transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

.slide-left-enter-from {
    transform: translateX(100%);
    opacity: 0.7;
}

.slide-left-leave-to {
    transform: translateX(-100%);
    opacity: 0.7;
}

.slide-right-enter-from {
    transform: translateX(-100%);
    opacity: 0.7;
}

.slide-right-leave-to {
    transform: translateX(100%);
    opacity: 0.7;
}

/* Side navigation buttons */
.carousel-nav-btn {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    height: 74px;
    background-color: rgba(0, 0, 0, 0.45);
    border: 1px solid #555;
    color: #fff;
    font-size: 26px;
    font-family: minecraftio, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 95;
    transition: all 0.18s ease;
    user-select: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.prev-btn {
    left: 12px;
    border-radius: 4px 0 0 4px;
}

.next-btn {
    right: 12px;
    border-radius: 0 4px 4px 0;
}

.carousel-nav-btn:hover {
    background-color: rgba(36, 36, 36, 0.9);
    border-color: #fc9802;
    color: #fc9802;
    transform: translateY(-50%) scale(1.08);
}

/* Blank placeholder cards */
.blank-placeholder-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 20px;
    box-sizing: border-box;
}

.blank-card {
    background-color: rgba(0, 0, 0, 0.55);
    border: 2px solid #444;
    border-radius: 6px;
    padding: 40px 60px;
    text-align: center;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
    max-width: 450px;
    width: 100%;
}

.blank-icon {
    font-size: 42px;
    margin-bottom: 12px;
}

.blank-card h2 {
    font-size: 24px;
    margin: 0 0 8px 0;
    color: #ffffff;
    text-shadow: 2px 2px 0px #000;
}

.placeholder-subtitle {
    font-size: 14px;
    color: #888888;
    margin: 0;
}

/* Page Indicator Dots */
.carousel-indicators {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    z-index: 90;
}

.indicator-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.25);
    border: 1px solid #555;
    cursor: pointer;
    padding: 0;
    transition: all 0.2s ease;
}

.indicator-dot:hover {
    background-color: rgba(252, 152, 2, 0.6);
    border-color: #fc9802;
}

.indicator-dot.active {
    background-color: #fc9802;
    border-color: #fff;
    transform: scale(1.3);
    box-shadow: 0 0 6px rgba(252, 152, 2, 0.8);
}
</style>
