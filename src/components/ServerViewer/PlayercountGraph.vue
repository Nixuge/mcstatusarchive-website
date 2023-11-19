<script setup lang="ts">
import { Line } from 'vue-chartjs'
import { type ServerSnapshot } from '@/ts/types/serversnapshot'
import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue';

// Needed for chart to render
import { Chart as chartjs, registerables } from 'chart.js';
chartjs.register(...registerables);
import 'chartjs-adapter-luxon'

import { useSnapshots } from '@/stores/serverviewer/snapshots';
const { getServerSnapshotsForDateRange } = useSnapshots();

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
        legend: false // Hide legend
    },
    scales: {
        x: {
            display: false, // Hide X axis labels
            type: 'time'
        }
    }   
}

const playerStatsDiv = ref(null) as unknown as Ref<HTMLDivElement>;

function updateGraph() {
    if (getServerSnapshotsForDateRange().length == 0)
        return
    
    const snapshots = getServerSnapshotsForDateRange();

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

    data.value = {
        labels: labels,
        datasets: [{
            label: 'Players on',
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
}

watch(getServerSnapshotsForDateRange, () => {
    updateGraph();
});
onMounted(() => {
    updateGraph();
    window.addEventListener("resize", updateGraph)
})
onUnmounted(() => {
    window.removeEventListener("resize", updateGraph)
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
  height: 100px;
}
</style>