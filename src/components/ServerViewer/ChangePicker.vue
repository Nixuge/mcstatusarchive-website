<script setup lang="ts">
import { onMounted, ref, watch, type Ref } from 'vue';
// Using the datepicker's css & classes to have a consistent styling
import '@vuepic/vue-datepicker/dist/main.css'

import { useChangeKey } from '@/stores/serverviewer/changekey';
const { setCurrentKey } = useChangeKey();

const selected = ref('All');
const keys = ["All", "players_on", "players_max", "ping", "players_sample", "version_protocol", "version_name", "motd"]
watch(selected, () => {
    setCurrentKey(selected.value);
})

onMounted(() => {

})
</script>

<template>
    <div class="owo dp__theme_dark dp__main dp__input">
        <select v-model="selected" class="selector">
            <option v-for="key of keys" :value="key">{{ key }}</option>
        </select>
    </div>
</template>

<style scoped>
    .owo {
        width: 100%;
        cursor: pointer;
    }
    .selector {
        width: 100%;
        background: transparent;
        color: #fff;
        border: 0;
    }
</style>