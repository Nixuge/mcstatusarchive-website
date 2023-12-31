<script setup lang="ts">
import { Line } from 'vue-chartjs'
import { type ServerSnapshot } from '@/ts/types/serversnapshot'
import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue';

// Needed for chart to render
import { Chart as chartjs, registerables } from 'chart.js';
chartjs.register(...registerables);
import 'chartjs-adapter-luxon'

import { useSnapshots } from '@/stores/serverviewer/snapshots';
const { getServerSnapshotsForDateRange, getServerSnapshotsForDateRangePaddings } = useSnapshots();

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
    // Math.round(prompt('Enter a number', 33) / 10) * 10);
let currentWidth = 0;

function resizeUpdateGraph() {
    // Avoid recalculating at every resize, only do it every 10px change
    const divWidth = playerStatsDiv.value.clientWidth;
    if (Math.abs(currentWidth - divWidth) < 10) 
        return;
    currentWidth = divWidth;
    updateGraph();
}

function updateGraph() {
    // Do not calculate if snapshots is empty (not yet loaded)
    if (getServerSnapshotsForDateRange().length == 0) {
        setGraphValue([], []);
        return
    }

    startTiming("recalculateGraph");

    const snapshots = getServerSnapshotsForDateRangePaddings();

    const divWidth = playerStatsDiv.value.clientWidth;
    const snapshotsLen = snapshots.length;
    let oneEvery = 1
    if (divWidth < snapshotsLen)
        oneEvery = Math.floor((snapshotsLen / playerStatsDiv.value.clientWidth));
    
    let lastPlayersOn = Number.NaN;
    let lastSaveTime = Number.MAX_VALUE;
    let labels = []
    let playerCount = []
    let playerAverageList = []
    for (let i = 0; i < snapshots.length; i++) {
        const snapshot = snapshots[i];
        
        // Fill in empty parts
        const diff = (snapshot.save_time - lastSaveTime)
        if (diff > 60*60) { // 1h+ of downtime
            const insts = Math.floor(diff / 60)
            for (let i2 = 0; i2 < insts; i2++) {
                if (i2 % oneEvery != 0)
                    continue
                const newTime = (lastSaveTime + (60 * (i2+1))) * 1000;
                
                labels.push(newTime);
                playerCount.push(NaN);
            }
        }
        

        lastSaveTime = snapshot.save_time;
        
        if (snapshot.players_on != undefined) // can be undefined/null
            lastPlayersOn = snapshot.players_on;
        
        playerAverageList.push(lastPlayersOn);
        if (i % oneEvery != 0)
            continue

        // A bit more expansive to make the average,
        // but it looks way better for bigger ranges (almost all)
        playerAverageList = playerAverageList.filter(elem => {return elem != null})

        const sum = playerAverageList.reduce((a, b) => a + b, 0);
        // const playerAverage = Math.floor(sum / playerAverageList.length);
        const playerAverage = sum / playerAverageList.length;
        playerAverageList = [];

        labels.push(snapshot.save_time * 1000)
        playerCount.push(playerAverage)
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