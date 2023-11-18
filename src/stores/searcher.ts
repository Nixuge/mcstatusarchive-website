import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useSearcher = defineStore('searcher', () => {
    const searchText = ref("")

    function setSearchText(text: string) {
        searchText.value = text.toLowerCase();
    }

    function getSearchText() {
        return searchText.value;
    }

    return { setSearchText, getSearchText }
})
