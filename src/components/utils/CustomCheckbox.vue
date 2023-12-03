<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
    onChange: (value: boolean) => void
}>();

const isCheckedRef = ref(false);

function onCheckboxClick(event: any) {
    const checked = event.target.checked;
    // isChecked = checked;
    isCheckedRef.value = checked;
    props.onChange(checked);
}
function toggle() {
    // isChecked = !isChecked;
    isCheckedRef.value = !isCheckedRef.value;
    props.onChange(isCheckedRef.value);
}

// checkmarks in mc font: ✓✔✅
// Edit: ends up being over engineered for a div you can click on :/
</script>

<template>
    <label class="container" @click="toggle">{{ isCheckedRef ? "Descending" : "Ascending" }}
        <input type="checkbox" @change="onCheckboxClick" :checked="true">
    </label>
</template>

<style scoped>
.container {
    background: #000;
    position: relative;
    border: 1px solid #6f6f6f;
    padding: 3px;
    padding-bottom: 4px;
    cursor: pointer;
}
input {
    cursor: pointer;
}
input {
    -webkit-appearance: initial;
    appearance: initial;
    width: 10px;
    height: 30px;
    /* background: #000; */
    position: relative;
    /* border: 1px solid #6f6f6f; */
    transform: translateY(8px);
}
input:not(:checked) {
    width: 22px;
}
input:after {
    color: #fff;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%,-50%);
    content: "";
}
input:checked:after {
    content: "✔";
}
</style>