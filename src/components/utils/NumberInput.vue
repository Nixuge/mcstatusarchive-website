<script setup lang="ts">
import { elements } from 'chart.js';
import { onMounted, ref, type Ref } from 'vue';

const props = defineProps<{
    placeholder: string;
    onChange: (value: number) => void
    step?: number;
    max?: number;
    fontSize?: string;
}>();

const inputElement = ref(null) as unknown as Ref<HTMLInputElement>;

onMounted(() => {
    // inputElement.value
})

function checkBeforeInput(_input: Event) {
    const input = _input as InputEvent; // thank you Vue
    if (input.data != null && !"0123456789".includes(input.data))
        input.preventDefault();
}

function setInput(_input: Event) {
    const newValue = Number(inputElement.value.value);

    if (props.max != undefined && newValue > props.max) {
        const newVal = String(props.max);
        if (inputElement.value.value == newVal)
            return;
        inputElement.value.value = newVal;
    }
    props.onChange(newValue);
}

function setInputValueArrows(newValue: number) {
    if (newValue == 0) {
        // @ts-ignore
        inputElement.value.value = null;
    } else {
        inputElement.value.value = String(newValue);
    } 
    props.onChange(newValue);
}

function add() {
    const currentValue = Number(inputElement.value.value);
    const step = props.step ? props.step : 1;
    const newValue = currentValue + step;
    if (props.max != undefined) {
        if (currentValue > props.max) 
            return;
    
        if (newValue > props.max) {
            setInputValueArrows(props.max);
            return;
        }
    }
    setInputValueArrows(newValue);
}
function substract() {
    const currentValue = Number(inputElement.value.value);
    const step = props.step ? props.step : 1;
    const newValue = currentValue - step;
    if (newValue <= 0) {
        if (currentValue == 0)
            return;
        setInputValueArrows(0);
        return;
    }
    setInputValueArrows(newValue);
}
const fontSize = props.fontSize ? props.fontSize : "1rem";
</script>

<template>
    <div class="input">
        <span class="arrow left" @click="add">^</span>
        <input ref="inputElement" class="search" :placeholder="placeholder" @beforeinput="checkBeforeInput" @input="setInput"/>
        <span class="arrow right" @click="substract">^</span>
    </div>
</template>

<style scoped>
.arrow {
    display: inline-block;
    padding-left: 3px;
    -webkit-user-select: none; /* Safari */
    user-select: none; /* Standard syntax */
    cursor: pointer;
}
.left {
    vertical-align: middle;
}
.right {
    transform: rotate(180deg);
    vertical-align: 2px;
}
.search:focus-visible {
    outline: 0px solid #6f6f6f;
}
.input {
    /* line-height: 1; Without that there was a small 3px padding on top */
    display: inline-block;
    background-color: #000;
    color: #fff;
    border: 1px solid #6f6f6f;
}
.search {
    text-align: center;
    margin: 4px 2px;
    background: transparent;
    color: #fff;
    border: none;
    width: 53px;
}
.search::placeholder {
    font-size: v-bind("fontSize");
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}
</style>