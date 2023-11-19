import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'

export const useSearcher = defineStore('searcher', () => {
    // const searchInput = ref(null) as unknown as Ref<HTMLInputElement>;
    const searchText = ref("");

    function searchInputMount(elem: HTMLInputElement) {
        // searchInput.value = elem;
        elem.value = searchText.value;
    }

    function setSearchText(text: string) {
        searchText.value = text.toLowerCase();
    }

    function getSearchText() {
        return searchText.value;
    }

    return { setSearchText, getSearchText, searchInputMount }
})
