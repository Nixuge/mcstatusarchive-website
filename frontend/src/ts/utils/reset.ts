import { useSnapshots } from '@/stores/serverviewer/snapshots';
const { reset: resetSnapshots } = useSnapshots();

import { useDates } from '@/stores/serverviewer/dates';
const { reset: resetDates } = useDates();

import { useChangeKey } from '@/stores/serverviewer/changekey';
const { reset: resetKey } = useChangeKey();

import { useTimings } from '@/stores/serverviewer/debug/timings';
const { reset: resetTimings } = useTimings();

export function resetAll() {
    resetSnapshots();
    resetDates();
    resetKey();
    resetTimings();
}