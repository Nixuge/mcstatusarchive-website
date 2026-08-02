import type { ServerDataResponse, ServerSnapshot } from "../types/serversnapshot";

export function binarySearchBetween(arr: number[] | undefined, val: number): number {
    if (arr === undefined || arr.length === 0)
        return -2;

    const max = arr.length - 1;
    let start = 0;    
    let end = max;

    if (val >= arr[max])
        return max;
    if (val <= arr[0])
        return 0;
  
    while (start <= end) {
        let mid = Math.floor((start + end) / 2);
        
        if (arr[mid] === val) {
            return mid;
        }
        
        if (val > arr[mid]) {
            if (mid < max && arr[mid+1] > val) {
                return mid;
            }
            start = mid + 1;
        } else {
            end = mid - 1;
        }
    }
    return -1;
}

export function binarySearchNormal(arr: number[] | undefined, val: number): number {
    return binarySearchBetween(arr, val);
}

export class SnapshotSearcher {
    rawResponse: ServerDataResponse;
    heartbeats: number[];
    fieldTimestamps: Map<string, number[]>;
    fieldValues: Map<string, any[]>;

    constructor(data: ServerDataResponse) {
        this.rawResponse = data;
        this.heartbeats = data.heartbeats || [];
        this.fieldTimestamps = new Map();
        this.fieldValues = new Map();

        if (data.metrics) {
            for (const [key, tuples] of Object.entries(data.metrics)) {
                const tsList: number[] = [];
                const valList: any[] = [];
                for (const [ts, val] of tuples) {
                    tsList.push(ts);
                    valList.push(val);
                }
                this.fieldTimestamps.set(key, tsList);
                this.fieldValues.set(key, valList);
            }
        }

        if (data.texts) {
            const textValues = data.text_values || {};
            for (const [key, tuples] of Object.entries(data.texts)) {
                const tsList: number[] = [];
                const valList: any[] = [];
                for (const [ts, valId] of tuples) {
                    tsList.push(ts);
                    const resolvedVal = textValues[String(valId)] !== undefined ? textValues[String(valId)] : valId;
                    valList.push(resolvedVal);
                }
                this.fieldTimestamps.set(key, tsList);
                this.fieldValues.set(key, valList);
            }
        }
    }

    public getHeartbeats(): number[] {
        return this.heartbeats;
    }

    public getFieldChanges(field: string): [number, any][] {
        const tsList = this.fieldTimestamps.get(field) || [];
        const valList = this.fieldValues.get(field) || [];
        const result: [number, any][] = [];
        for (let i = 0; i < tsList.length; i++) {
            result.push([tsList[i], valList[i]]);
        }
        return result;
    }

    public grabLatestSnapshotData(lowerDateLimit: number): ServerSnapshot {
        const finalSnapshot: ServerSnapshot = {
            save_time: lowerDateLimit,
            type: this.rawResponse.server?.type,
        };

        const allKeys = new Set([...this.fieldTimestamps.keys()]);
        for (const key of allKeys) {
            const tsList = this.fieldTimestamps.get(key)!;
            const valList = this.fieldValues.get(key)!;
            const idx = binarySearchBetween(tsList, lowerDateLimit);
            if (idx >= 0 && idx < valList.length) {
                finalSnapshot[key] = valList[idx];
            }
        }

        return finalSnapshot;
    }

    public grabDateRangeIndex(lowerDate: number, higherDate: number): number[] {
        const fullSaveArr = this.heartbeats;
        if (fullSaveArr.length === 0) return [0, -1];

        const max = fullSaveArr.length - 1;
        if (higherDate < fullSaveArr[0] || lowerDate > fullSaveArr[max]) {
            return [0, -1];
        }

        let lowerBoundKeyIndex = 0;
        if (lowerDate > fullSaveArr[0]) {
            let idx = binarySearchBetween(fullSaveArr, lowerDate);
            lowerBoundKeyIndex = (fullSaveArr[idx] === lowerDate) ? idx : idx + 1;
        }

        let higherBoundKeyIndex = max;
        if (higherDate < fullSaveArr[max]) {
            higherBoundKeyIndex = binarySearchBetween(fullSaveArr, higherDate);
        }

        if (lowerBoundKeyIndex > higherBoundKeyIndex) {
            return [0, -1];
        }

        return [lowerBoundKeyIndex, higherBoundKeyIndex];
    }

    public grabSnapshotDateCategory(lowerDate: number, higherDate: number, category: string): number[] {
        if (category === "all") {
            const range = this.grabDateRangeIndex(lowerDate, higherDate);
            if (range[1] < range[0]) return [];
            const indices: number[] = [];
            for (let i = range[0]; i <= range[1] && i < this.heartbeats.length; i++) {
                indices.push(i);
            }
            return indices;
        }

        const categoryArr = this.fieldTimestamps.get(category);
        if (categoryArr == null || categoryArr.length === 0)
            return [];

        const max = categoryArr.length - 1;
        if (higherDate < categoryArr[0] || lowerDate > categoryArr[max]) {
            return [];
        }

        let lowerBoundKeyIndex = 0;
        if (lowerDate > categoryArr[0]) {
            let idx = binarySearchBetween(categoryArr, lowerDate);
            lowerBoundKeyIndex = (categoryArr[idx] === lowerDate) ? idx : idx + 1;
        }

        let higherBoundKeyIndex = max;
        if (higherDate < categoryArr[max]) {
            higherBoundKeyIndex = binarySearchBetween(categoryArr, higherDate);
        }

        if (lowerBoundKeyIndex > higherBoundKeyIndex) return [];
        return categoryArr.slice(lowerBoundKeyIndex, higherBoundKeyIndex + 1);
    }
}