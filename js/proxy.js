// Shared Ultraviolet setup: registers the service worker, picks a working
// Wisp server and configures the bare-mux transport before any navigation.
(() => {
    const DEFAULT_WISP = "wss://wisp.mercurywork.shop/";
    // Old defaults that no longer respond; saved copies get migrated
    const DEAD_WISP = [
        "wss://wisp.rhw.one/",
        "wss://construction.services.codd70.ru/socket/",
    ];
    const TRANSPORT = "/libcurl/index.mjs";

    let connection = null;
    let readyPromise = null;

    function getWispUrl() {
        let url = localStorage.getItem("nOS_wispUrl");
        if (!url || DEAD_WISP.includes(url)) {
            url = DEFAULT_WISP;
            localStorage.setItem("nOS_wispUrl", url);
        }
        return url;
    }

    async function registerServiceWorker() {
        if (!("serviceWorker" in navigator)) {
            throw new Error("Service workers are not supported in this browser");
        }
        const reg = await navigator.serviceWorker.register("/uv/sw.js", {
            scope: "/uv/",
            updateViaCache: "none",
        });
        if (reg.active) return reg;

        // navigator.serviceWorker.ready only resolves for pages inside the
        // worker scope, so wait on the worker's own state instead
        const worker = reg.installing || reg.waiting;
        await new Promise((resolve) => {
            if (!worker || worker.state === "activated") return resolve();
            worker.addEventListener("statechange", () => {
                if (worker.state === "activated") resolve();
            });
        });
        return reg;
    }

    async function setTransport() {
        if (!connection) connection = new BareMux.BareMuxConnection("/baremux/worker.js");
        await connection.setTransport(TRANSPORT, [{ websocket: getWispUrl() }]);
    }

    function ready() {
        if (!readyPromise) {
            readyPromise = Promise.all([registerServiceWorker(), setTransport()]).catch((err) => {
                readyPromise = null;
                console.error("Proxy setup failed:", err);
                throw err;
            });
        }
        return readyPromise;
    }

    async function setWispUrl(url) {
        localStorage.setItem("nOS_wispUrl", url);
        await setTransport();
    }

    function encode(url) {
        return __uv$config.prefix + __uv$config.encodeUrl(url);
    }

    window.NautilusProxy = { DEFAULT_WISP, getWispUrl, setWispUrl, ready, encode };
})();
