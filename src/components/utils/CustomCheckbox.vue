<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
    onChange: (value: boolean) => void
}>();

const isChecked = ref(false);

function onChangeLocal(event: any) {
    const checked = event.target.checked;
    isChecked.value = checked;
    props.onChange(checked);
}

// checkmarks in mc font: ✓✔✅
</script>

<template>
    <label class="container">{{ isChecked ? "Ascending" : "Descending" }}
        <input v-bind:checked="isChecked" type="checkbox" @change="onChangeLocal">
        <span class="checkmark"></span>
    </label>
</template>

<style scoped>
input {
    -webkit-appearance: initial;
    appearance: initial;
    width: 31px;
    height: 31px;
    background: #000;
    position: relative;
    border: 1px solid #6f6f6f;
    transform: translateY(8px);
}
input:checked:after {
    content: "✔";
    color: #fff;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%,-50%);

}
</style>