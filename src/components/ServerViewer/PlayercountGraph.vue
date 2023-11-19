<script setup lang="ts">
import { Line } from 'vue-chartjs'
import { type ServerSnapshot } from '@/ts/types/serversnapshot'
import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue';

// Needed for chart to render
import { Chart as chartjs, registerables } from 'chart.js';
chartjs.register(...registerables);

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
            display: false // Hide X axis labels
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
    let snapshot = null;
    let labels = []
    let playerCount = []
    let playerAverageList = []
    for (let i = 0; i < snapshots.length; i++) {
        snapshot = snapshots[i];
        lastPlayersOn = (snapshot.players_on) ? snapshot.players_on : lastPlayersOn;
        playerAverageList.push(lastPlayersOn);

        if (i % oneEvery != 0)
            continue

        // A bit more expansive to make the average,
        // but it looks way better for bigger ranges (almost all)

        const sum = playerAverageList.reduce((a, b) => a + b, 0);
        // const playerAverage = Math.floor(sum / playerAverageList.length);
        const playerAverage = sum / playerAverageList.length;
        playerAverageList = [];

        labels.push(snapshot.save_date.toLocaleString("fr-FR"))
        playerCount.push(playerAverage)
    }

    data.value ={
        labels: labels,
        datasets: [
          {
            label: 'Players on',
            borderColor: '#fc9802',
            backgroundColor: '#fcad02',
            data: playerCount,
            tension: 0.3,
            fill: true,
            pointHitRadius: 5,
            pointRadius: 0,
            pointBorderWidth: 0,
            pointHoverRadius: 4
          }
        ]
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