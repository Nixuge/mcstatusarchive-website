export function dateToUnix(date: Date) {
    return parseInt((date.getTime() / 1000).toFixed(0));
}
export function unixToDate(unix: number) {
    return new Date(unix * 1000);
}