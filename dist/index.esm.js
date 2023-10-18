import uuid from 'uuid-random';

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

var version = "1.1.0";

var ActionMetaType;
(function (ActionMetaType) {
    ActionMetaType["REQUEST"] = "request";
    ActionMetaType["RESPONSE"] = "response";
})(ActionMetaType || (ActionMetaType = {}));
function compose(...funcs) {
    if (funcs.length === 0) {
        return (arg) => arg;
    }
    funcs = funcs.filter((func) => typeof func === 'function');
    if (funcs.length === 1) {
        return funcs[0];
    }
    return funcs.reduce((a, b) => (...args) => a(b(...args)));
}
const Logger = (() => {
    const prefix = '[webview-bridge]';
    return {
        log: (...args) => console.log(prefix, ...args),
        warn: (...args) => console.warn(prefix, ...args),
        error: (...args) => console.error(prefix, ...args),
    };
})();
const warnNoAsyncMessageResponse = (action) => {
    Logger.error(`Cannot make a response. To be able to response to action '${action.type}' please dispatch it using 'dispatchAsync' bridge method.`);
};
const warnNoPostMessageProvided = (message, action) => Logger.warn(`Cannot dispatch action '${action.type}. 'Please provide post message implementation calling 'bridge.setPostMessage' first.`);
const SYNC_MESSAGE = '@@INTERNAL_SYNC_MESSAGE';
const createBridge = (options, middlewares) => {
    var _a;
    let postMessage = (_a = options === null || options === void 0 ? void 0 : options.postMessage) !== null && _a !== void 0 ? _a : warnNoPostMessageProvided;
    let listeners = [];
    const subscribe = (listener) => {
        listeners.push(listener);
        return () => {
            listeners = listeners.filter((current) => current !== listener);
        };
    };
    let eventListeners = {};
    const listenEvent = (type, handler) => {
        var _a;
        const eventListenerId = uuid();
        eventListeners[type] = (_a = eventListeners[type]) !== null && _a !== void 0 ? _a : {};
        eventListeners[type][eventListenerId] = handler;
        return () => {
            delete eventListeners[type][eventListenerId];
        };
    };
    const internalDispatch = (action) => {
        const { meta, type } = action;
        if (!meta.external) {
            try {
                const serializedMessage = JSON.stringify(action);
                postMessage(serializedMessage, action);
            }
            catch (e) {
                throw e;
            }
        }
        if (meta.type === ActionMetaType.REQUEST && meta.external) {
            if (eventListeners[type]) {
                let resolved = false;
                const done = ((responseAction) => {
                    const { type = action.type, payload, meta } = responseAction !== null && responseAction !== void 0 ? responseAction : {};
                    if (resolved) {
                        Logger.warn(`You're trying to resolve async request that is already done.`);
                        return;
                    }
                    resolved = true;
                    localResponseDispatch({
                        type,
                        payload,
                        meta: Object.assign(Object.assign({}, meta), { id: action.id }),
                    });
                });
                const error = ((errorResponse) => {
                    if (resolved) {
                        Logger.warn(`You're trying to reject async request that is already done.`);
                        return;
                    }
                    resolved = true;
                    const isError = errorResponse instanceof Error;
                    const isString = typeof errorResponse === 'string';
                    const isAction = !(isError || isString || !errorResponse);
                    const { type, payload, meta = {} } = (isAction ? errorResponse : {});
                    let serializedError;
                    switch (true) {
                        case isError:
                            serializedError = {
                                message: errorResponse.toString(),
                            };
                            break;
                        case isString:
                            serializedError = {
                                message: errorResponse,
                            };
                            break;
                        default:
                            serializedError = payload;
                    }
                    localResponseDispatch({
                        type: type !== null && type !== void 0 ? type : action.type,
                        payload: serializedError,
                        meta: Object.assign(Object.assign({}, meta), { id: action.id, error: true }),
                    });
                });
                const warnArgumentUsage = () => warnNoAsyncMessageResponse(action);
                const doneCallback = meta.async ? done : warnArgumentUsage;
                const errorCallback = meta.async ? error : warnArgumentUsage;
                const listeners = Object.values(eventListeners[type]);
                listeners.forEach((listener) => listener(action, doneCallback, errorCallback));
            }
        }
    };
    let bridge = {};
    const listenMiddleware = (() => (next) => (action) => {
        listeners.forEach((listener) => {
            listener(action);
        });
        return next(action);
    });
    const chain = [listenMiddleware, ...middlewares].map((middleware) => middleware(bridge));
    const wrappedDispatch = compose(...chain)(internalDispatch);
    const localRequestDispatch = ((action) => {
        var _a;
        const { type, payload = {} } = action;
        const id = uuid();
        const meta = Object.assign(Object.assign({}, ((_a = action.meta) !== null && _a !== void 0 ? _a : {})), { external: false, type: ActionMetaType.REQUEST });
        return wrappedDispatch({ id, type, payload, meta });
    });
    const localResponseDispatch = ((action) => {
        const { type, payload = {}, meta = {} } = action;
        const id = uuid();
        return wrappedDispatch({
            id,
            type,
            payload,
            meta: Object.assign(Object.assign({}, meta), { external: false, type: ActionMetaType.RESPONSE }),
        });
    });
    const localRequestDispatchAsync = ((action) => {
        var _a;
        return localRequestDispatch(Object.assign(Object.assign({}, action), { meta: Object.assign(Object.assign({}, ((_a = action.meta) !== null && _a !== void 0 ? _a : {})), { async: true }) }));
    });
    const externalDispatch = ((action) => {
        var _a;
        return wrappedDispatch(Object.assign(Object.assign({}, action), { meta: Object.assign(Object.assign({}, ((_a = action.meta) !== null && _a !== void 0 ? _a : {})), { external: true }) }));
    });
    const onMessage = ((message) => {
        try {
            const action = typeof message === 'string' ? JSON.parse(message) : message;
            externalDispatch(action);
        }
        catch (error) {
            throw error;
        }
    });
    const setPostMessage = (nextPostMessage) => {
        postMessage = nextPostMessage;
    };
    const sync = (timeout = 5000) => __awaiter(void 0, void 0, void 0, function* () {
        const version = yield Promise.race([
            (() => __awaiter(void 0, void 0, void 0, function* () {
                const { version } = yield bridge.dispatchAsync({
                    type: SYNC_MESSAGE,
                    payload: { version: bridge.version },
                });
                return version;
            }))(),
            new Promise((resolve) => {
                setTimeout(() => resolve(false), timeout);
            }),
        ]);
        if (version === false) {
            throw new Error('Error: AsyncBridge.sync timeout. AsyncBridge was not able to receive response from the other side.');
        }
        return {
            version: bridge.version,
            otherSideVersion: version,
        };
    });
    listenEvent(SYNC_MESSAGE, ({ payload }, done) => {
        done({ payload: { version: bridge.version } });
    });
    bridge = {
        version,
        sync,
        dispatch: localRequestDispatch,
        dispatchAsync: localRequestDispatchAsync,
        setPostMessage,
        subscribe,
        onMessage,
        listenEvent,
    };
    return bridge;
};
const asyncMiddleware = (() => {
    const awaitMap = {};
    return (next) => (action) => {
        var _a, _b, _c, _d, _e, _f;
        // returning promise for async request action
        if (((_a = action === null || action === void 0 ? void 0 : action.meta) === null || _a === void 0 ? void 0 : _a.async) && ((_b = action === null || action === void 0 ? void 0 : action.meta) === null || _b === void 0 ? void 0 : _b.type) === ActionMetaType.REQUEST && !((_c = action === null || action === void 0 ? void 0 : action.meta) === null || _c === void 0 ? void 0 : _c.external)) {
            const id = action === null || action === void 0 ? void 0 : action.id;
            return new Promise((resolve, reject) => {
                awaitMap[id] = {
                    resolve: (payload) => {
                        resolve(payload);
                        delete awaitMap[id];
                    },
                    reject: (error) => {
                        reject(error);
                        delete awaitMap[id];
                    },
                };
                next(action);
            });
            // solving promise in case if received response action with same id
        }
        else if (((_d = action === null || action === void 0 ? void 0 : action.meta) === null || _d === void 0 ? void 0 : _d.type) === ActionMetaType.RESPONSE && ((_e = action === null || action === void 0 ? void 0 : action.meta) === null || _e === void 0 ? void 0 : _e.external)) {
            const id = (_f = action === null || action === void 0 ? void 0 : action.meta) === null || _f === void 0 ? void 0 : _f.id;
            if (awaitMap[id]) {
                if (!action.meta.error) {
                    awaitMap[id].resolve(action.payload);
                }
                else {
                    awaitMap[id].reject(action.payload);
                }
            }
            else {
                return next(action);
            }
        }
        else {
            return next(action);
        }
    };
});
function createAsyncBridge(options = {}, middlewares = []) {
    return createBridge(options, [asyncMiddleware, ...middlewares]);
}

export { compose, createAsyncBridge };
