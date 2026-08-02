<script setup lang="ts">
import { Line } from 'vue-chartjs'
import { type ServerSnapshot } from '@/ts/types/serversnapshot'
import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue';

// Needed for chart to render
import { Chart as chartjs, registerables } from 'chart.js';
chartjs.register(...registerables);
import 'chartjs-adapter-luxon'

import { useSnapshots } from '@/stores/serverviewer/snapshots';
const { getServerSnapshotsForDateRange, getSnapshotSearcher } = useSnapshots();

import { useTimings } from '@/stores/serverviewer/debug/timings';
const { startTiming, endTiming } = useTimings();

const data: Ref<any> = ref({
    labels: ['', ''],
    datasets: [{
        label: 'Loading data...',
        data: [1, 1],
        borderColor: '#fc9802',
        backgroundColor: '#fcad02'
    }]
})

const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        // legend: false // Hide legend
    },
    scales: {
        x: {
            display: false, // Hide X axis labels
            type: 'time'
        }
    }   
}

const playerStatsDiv = ref(null) as unknown as Ref<HTMLDivElement>;
let currentWidth = 0;

function resizeUpdateGraph() {
    const divWidth = playerStatsDiv.value.clientWidth;
    if (Math.abs(currentWidth - divWidth) < 10) 
        return;
    currentWidth = divWidth;
    updateGraph();
}

function updateGraph() {
    const timestamps = getServerSnapshotsForDateRange();
    const searcher = getSnapshotSearcher();
    if (timestamps.length == 0 || !searcher) {
        setGraphValue([], []);
        return;
    }

    startTiming("recalculateGraph");

    const divWidth = playerStatsDiv.value.clientWidth;
    const snapshotsLen = timestamps.length;
    let oneEvery = 1;
    if (divWidth < snapshotsLen)
        oneEvery = Math.floor((snapshotsLen / divWidth));
    
    let lastSaveTime = Number.MAX_VALUE;
    let labels = [];
    let playerCount = [];
    let playerAverageList = [];

    for (let i = 0; i < timestamps.length; i++) {
        const ts = timestamps[i];
        
        // Fill in downtime empty parts
        const diff = (ts - lastSaveTime);
        if (diff > 60*60) { // 1h+ of downtime
            const insts = Math.floor(diff / 60);
            for (let i2 = 0; i2 < insts; i2++) {
                if (i2 % oneEvery != 0)
                    continue;
                const newTime = (lastSaveTime + (60 * (i2+1))) * 1000;
                labels.push(newTime);
                playerCount.push(NaN);
            }
        }

        lastSaveTime = ts;
        const snapshot = searcher.grabLatestSnapshotData(ts);
        const playersOn = snapshot.players_on;
        
        if (playersOn !== undefined && playersOn !== null) {
            playerAverageList.push(playersOn);
        }
        
        if (i % oneEvery != 0)
            continue;

        const validList = playerAverageList.filter(elem => elem != null && !isNaN(elem));
        let playerAverage = NaN;
        if (validList.length > 0) {
            const sum = validList.reduce((a, b) => a + b, 0);
            playerAverage = sum / validList.length;
        }
        playerAverageList = [];

        labels.push(ts * 1000);
        playerCount.push(playerAverage);
    }
    endTiming("recalculateGraph", 0, divWidth + "/" + snapshotsLen);
    setGraphValue(labels, playerCount);
}

function setGraphValue(labels: number[], playerCount: number[]) {
    startTiming("graphDisplay")
    
    data.value = {
        labels: labels,
        datasets: [{
            label: 'Online Players',
            borderColor: '#fc9802',
            backgroundColor: '#fcad02',
            data: playerCount,
            tension: 0.3,
            fill: true,
            pointHitRadius: 5,
            pointRadius: 0,
            pointBorderWidth: 0,
            borderWidth: 1,
            pointHoverRadius: 4,
            spanGaps: false // only works if you fill in your data with NaNs
        }]
    }
    // Waiting a timeout so vue has the time to trigger the graph update,
    // then just wait until it unfreezes and calls this function.
    setTimeout(() => {
        endTiming("graphDisplay", 50)
    }, 50)
}

watch(getServerSnapshotsForDateRange, () => {
    updateGraph();
});
onMounted(() => {
    updateGraph();
    window.addEventListener("resize", resizeUpdateGraph)
})
onUnmounted(() => {
    window.removeEventListener("resize", resizeUpdateGraph)
})

</script>

<template>
    <div ref="playerStatsDiv" id="player_stats">
        <Line :data="data" :options="options"/>
    </div>
</template>

<style scoped>
#player_stats {
    width: 90%;
    background-color: rgba(0, 0, 0, 0.3);
    margin: auto;
    height: 130px;
}
</style>