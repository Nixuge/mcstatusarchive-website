import router from "@/router";

export function getIp() {
    const params = router.currentRoute.value.params;
    const data = params.server as string;
    return data;
}