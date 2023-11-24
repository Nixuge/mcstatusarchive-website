import type { ServerSnapshot } from "../types/serversnapshot";

export function binarySearchBetween(arr: number[] | undefined, val: number) {
    if (arr === undefined)
        return -2;

    const max = arr.length - 1;
    let start = 0;    
    let end = max;

    // Initial bound checks
    if (val >= arr[max])
        return max;
    if (val <= arr[0])
        return 0;
  
    while (start <= end) {
        let mid = Math.floor((start + end) / 2);
        
        // If is value directly
        if (arr[mid] === val) {
            return mid;
        }
        
        if (val > arr[mid]) {
            // If is between mid & mid+1 (inside if to avoid 1 unnecessary check)
            if (mid < max && arr[mid+1] > val) {
                return mid
            }
            // Else just continue searching
            start = mid + 1;
        } else {
            end = mid - 1;
        }
    }
    return -1;
}
export function binarySearchNormal(arr: number[] | undefined, val: number) {
    // The impact of 2 checks is so negligible it doesn't matter.
    // Keeping that there for now just in case it's necessary sometime in the future.
    return binarySearchBetween(arr, val)
}
export function normalSearch(arr: number[], val: number) {
    const max = arr.length - 1;
    if (val >= arr[max])
        return max;
    if (val <= arr[0])
        return 0;

    for (let i = 0; i < arr.length; i++) {
        const element = arr[i];
        if (element > val) {
            return i - 1;
        }
    }
    return -1;
}
// Note: both searchers above return the below index if found between 2 values
// This should only be an "issue" when searching for ranges,
// otherwise it's as excepted

export class SnapshotSearcher {
    searchKeys = ["players_on", "players_max", "ping", "players_sample", "version_protocol", "version_name", "motd"];
    validKeys = ["save_time", ...this.searchKeys];
    snapshotsRaw: ServerSnapshot[];
    snapshotsRawIndexesMap: Map<string, number[]>;
    snapshotsMap: Map<string, number[]>;

    constructor(snapshotsRaw: ServerSnapshot[]) {
        this.snapshotsRaw = snapshotsRaw;
        this.snapshotsMap = new Map();
        this.snapshotsRawIndexesMap = new Map();
        for (const key of this.validKeys) {
            this.snapshotsMap.set(key, []);
            this.snapshotsRawIndexesMap.set(key, []);
        }

        for (const [index, snapshot] of snapshotsRaw.entries()) {
            for (const key of this.validKeys) {
                if (snapshot[key] != null) { // save_time never null/undefined
                    this.snapshotsMap.get(key)!.push(snapshot.save_time);
                    this.snapshotsRawIndexesMap.get(key)!.push(index);
                }
            }
        }
    }

    public grabLatestSnapshotData(lowerDateLimit: number): ServerSnapshot {
        const finalSnapshot: ServerSnapshot = {save_time: lowerDateLimit};
        const fullSaveArr = this.snapshotsMap.get("save_time")!;
        for (const key of this.searchKeys) {
            // Get the first element below that changes this value
            const keyMap = this.snapshotsMap.get(key)!;
            const lowerBoundKeyIndex = binarySearchBetween(keyMap, lowerDateLimit);
            const lowerBoundKeySaveTime = keyMap[lowerBoundKeyIndex];
            // Then get the index of that from the full array
            // --> if we don't do that, we'll just end up grabbing some index that has
            // --- as a value, we NEED to search in the key array first to get the first
            // --- non null value from it.
            const lowerBoundFullIndex = binarySearchNormal(fullSaveArr, lowerBoundKeySaveTime);
            finalSnapshot[key] = this.snapshotsRaw[lowerBoundFullIndex][key];
        }

        return finalSnapshot;
    }

    public grabDateRangeIndex(lowerDate: number, higherDate: number): number[] {
        const fullSaveArr = this.snapshotsMap.get("save_time")!;

        let lowerBoundKeyIndex = binarySearchBetween(fullSaveArr, lowerDate);
        // Since we grab the element -1 if found in between, this should adapt it so that:
        // - if the element is in between 2 elements, it does grab the upper one (inside the range)
        // - if the element is equal to another element directly, it grabs that one directly
        lowerBoundKeyIndex = (fullSaveArr[lowerBoundKeyIndex] == lowerDate) ? lowerBoundKeyIndex : lowerBoundKeyIndex+1; 

        // No need for that logic for the higher bound (since it's either match or -1 so inside range by default)
        let higherBoundKeyIndex = binarySearchBetween(fullSaveArr, higherDate);

        return [lowerBoundKeyIndex, higherBoundKeyIndex];
    }

    public grabSnapshotDateCategory(lowerDate: number, higherDate: number, category: string): number[] {
        const categoryArr = this.snapshotsMap.get(category)!;
        if (categoryArr == null)
            return [-1];
        
        // Same as grabDateRangeIndex
        let lowerBoundKeyIndex = binarySearchBetween(categoryArr, lowerDate);
        lowerBoundKeyIndex = (categoryArr[lowerBoundKeyIndex] == lowerDate) ? lowerBoundKeyIndex : lowerBoundKeyIndex+1; 
        const higherBoundKeyIndex = binarySearchNormal(categoryArr, higherDate);

        const categoryRawIndexesArr = this.snapshotsRawIndexesMap.get(category)!;
        return categoryRawIndexesArr.slice(lowerBoundKeyIndex, higherBoundKeyIndex+1);
    }
}