import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useSelectedServer = defineStore('selectedServer', () => {
  const selectedServer = ref("")

  function changeSelectedServer(newSelectedServer: string) {
    selectedServer.value = newSelectedServer;
  }

  // Needed for reactivity
  function getSelectedServer() {
    return selectedServer.value;
   }
   
  return { getSelectedServer, selectedServer, changeSelectedServer }
})
