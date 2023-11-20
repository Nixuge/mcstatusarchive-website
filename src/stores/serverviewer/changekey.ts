import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'

export const useChangeKey = defineStore('changekey', () => {
    const currentKey = ref("All");

    function setCurrentKey(key: string) {
        currentKey.value = key;
    }

    function getCurrentKey() {
        return currentKey.value;
    }

    function reset() {
        currentKey.value = "All";
    }

    return { setCurrentKey, getCurrentKey, reset }
})
