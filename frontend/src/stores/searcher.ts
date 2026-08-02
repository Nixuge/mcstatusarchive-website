import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'

export const useSearcher = defineStore('searcher', () => {
    const searchText = ref("");
    const order = ref("alphabetical");
    const orderDescending = ref(true);
    const maxPing = ref(0);
    const minPlayerCount = ref(0);
    const serverType = ref("all"); // "all", "java", "bedrock"

    function searchInputMount(elem: HTMLInputElement) {
        if (elem) elem.value = searchText.value;
    }

    function setMaxPing(newMaxPing: number) {
        maxPing.value = newMaxPing;
    }
    function getMaxPing() {
        return maxPing.value;
    }

    function setOrder(newOrder: string) {
        order.value = newOrder;
    }
    function getOrder() {
        return order.value;
    }

    function setOrderDescending(newVal: boolean) {
        orderDescending.value = newVal;
    }
    function getOrderDescending() {
        return orderDescending.value;
    }

    function setMinPlayerCount(newMinPlayerCount: number) {
        minPlayerCount.value = newMinPlayerCount;
    }
    function getMinPlayerCount() {
        return minPlayerCount.value;
    }

    function setSearchText(text: string) {
        searchText.value = text.toLowerCase();
    }
    function getSearchText() {
        return searchText.value;
    }

    function setServerType(type: string) {
        serverType.value = type;
    }
    function getServerType() {
        return serverType.value;
    }

    return { 
        setSearchText, 
        getSearchText, 
        setMaxPing, 
        getMaxPing, 
        setMinPlayerCount, 
        getMinPlayerCount, 
        setOrder, 
        getOrder, 
        setOrderDescending, 
        getOrderDescending, 
        setServerType,
        getServerType,
        searchInputMount 
    }
})
