import uuid from 'uuid-random';
import { version } from '../package.json';

enum ActionMetaType {
    REQUEST = 'request',
    RESPONSE = 'response',
}

type ActionMeta = {
    type: ActionMetaType;
    external: boolean;
    async?: boolean;
    error?: boolean;
    id?: string;
};

type Action = {
    id?: string;
    type?: string;
    payload?: object | any;
    meta?: ActionMeta;
};

type DispatchFunction = (action: Action) => Promise<any>;
type MessageReceiveFunction = (message: string | object) => undefined | never;

type PostMessageHandler = (message: string, action: Action) => void | never;

type Bridge = {
    version: string;
    sync: any;
    dispatch: DispatchFunction;
    dispatchAsync: DispatchFunction;
    setPostMessage: (postMessage: PostMessageHandler) => void;
    subscribe: (listener: Function) => Function;
    onMessage: MessageReceiveFunction;
    listenEvent: (type: string, handler: Function) => Function;
};

type BridgeOptions = {
    postMessage?: PostMessageHandler;
};

type EventHandlerDoneCallback = (action: Action) => void;
type EventHandlerErrorCallback = (error: Error | string | object) => void;

type EventHandler =
    | ((action: Action, done: EventHandlerDoneCallback, error: EventHandlerErrorCallback) => void)
    | ((action: Action) => void);

type Middleware = (bridge: Bridge) => (next: (action: Action) => Promise<any>) => (action: Action) => Promise<any>;

type SyncResponse =
    | {
          version: string;
          otherSideVersion: string;
      }
    | never;

export function compose(...funcs) {
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

const warnNoAsyncMessageResponse = (action: Action) => {
    Logger.error(
        `Cannot make a response. To be able to response to action '${action.type}' please dispatch it using 'dispatchAsync' bridge method.`,
    );
};

const warnNoPostMessageProvided = (message: string, action: Action) =>
    Logger.warn(
        `Cannot dispatch action '${action.type}. 'Please provide post message implementation calling 'bridge.setPostMessage' first.`,
    );

const SYNC_MESSAGE = '@@INTERNAL_SYNC_MESSAGE';

const createBridge = (options: BridgeOptions, middlewares: Array<Middleware>): Bridge => {
    let postMessage = options?.postMessage ?? warnNoPostMessageProvided;

    let listeners = [];

    const subscribe = (listener) => {
        listeners.push(listener);

        return () => {
            listeners = listeners.filter((current) => current !== listener);
        };
    };

    let eventListeners = {};

    const listenEvent = (type: string, handler: EventHandler) => {
        const eventListenerId = uuid();
        eventListeners[type] = eventListeners[type] ?? {};
        eventListeners[type][eventListenerId] = handler;

        return () => {
            delete eventListeners[type][eventListenerId];
        };
    };

    const internalDispatch = (action: Action) => {
        const { meta, type } = action;

        if (!meta.external) {
            try {
                const serializedMessage = JSON.stringify(action);
                postMessage(serializedMessage, action);
            } catch (e) {
                throw e;
            }
        }

        if (meta.type === ActionMetaType.REQUEST && meta.external) {
            if (eventListeners[type]) {
                let resolved = false;

                const done = ((responseAction) => {
                    const { type = action.type, payload, meta } = responseAction ?? {};

                    if (resolved) {
                        Logger.warn(`You're trying to resolve async request that is already done.`);
                        return;
                    }
                    resolved = true;
                    localResponseDispatch({
                        type,
                        payload,
                        meta: {
                            ...meta,
                            id: action.id,
                        },
                    });
                }) as EventHandlerDoneCallback;

                const error = ((errorResponse) => {
                    if (resolved) {
                        Logger.warn(`You're trying to reject async request that is already done.`);
                        return;
                    }
                    resolved = true;
                    const isError = errorResponse instanceof Error;
                    const isString = typeof errorResponse === 'string';
                    const isAction = !(isError || isString || !errorResponse);
                    const { type, payload, meta = {} } = (isAction ? errorResponse : {}) as Action;

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
                        type: type ?? action.type,
                        payload: serializedError,
                        meta: { ...meta, id: action.id, error: true } as ActionMeta,
                    });
                }) as EventHandlerErrorCallback;

                const warnArgumentUsage = () => warnNoAsyncMessageResponse(action);
                const doneCallback = meta.async ? done : warnArgumentUsage;
                const errorCallback = meta.async ? error : warnArgumentUsage;

                const listeners = Object.values(eventListeners[type]) as Array<EventHandler>;

                listeners.forEach((listener) => listener(action, doneCallback, errorCallback));
            }
        }
    };

    let bridge = {} as Bridge;

    const listenMiddleware = (() => (next) => (action) => {
        listeners.forEach((listener) => {
            listener(action);
        });
        return next(action);
    }) as Middleware;

    const chain = [listenMiddleware, ...middlewares].map((middleware) => middleware(bridge));

    const wrappedDispatch = compose(...chain)(internalDispatch);

    const localRequestDispatch = ((action) => {
        const { type, payload = {} } = action;
        const id = uuid();
        const meta = {
            ...(action.meta ?? {}),
            external: false,
            type: ActionMetaType.REQUEST,
        } as ActionMeta;

        return wrappedDispatch({ id, type, payload, meta } as Action);
    }) as DispatchFunction;

    const localResponseDispatch = ((action) => {
        const { type, payload = {}, meta = {} } = action;
        const id = uuid();

        return wrappedDispatch({
            id,
            type,
            payload,
            meta: {
                ...meta,
                external: false,
                type: ActionMetaType.RESPONSE,
            } as ActionMeta,
        });
    }) as DispatchFunction;

    const localRequestDispatchAsync = ((action) => {
        return localRequestDispatch({
            ...action,
            meta: { ...(action.meta ?? {}), async: true } as ActionMeta,
        });
    }) as DispatchFunction;

    const externalDispatch = ((action) => {
        return wrappedDispatch({
            ...action,
            meta: {
                ...(action.meta ?? {}),
                external: true,
            },
        });
    }) as DispatchFunction;

    const onMessage = ((message) => {
        try {
            const action = typeof message === 'string' ? JSON.parse(message) : message;
            externalDispatch(action as Action);
        } catch (error) {
            throw error;
        }
    }) as MessageReceiveFunction;

    const setPostMessage = (nextPostMessage: PostMessageHandler): void => {
        postMessage = nextPostMessage;
    };

    const sync = async (timeout = 5000): Promise<SyncResponse> => {
        const version = await Promise.race([
            (async () => {
                const { version } = await bridge.dispatchAsync({
                    type: SYNC_MESSAGE,
                    payload: { version: bridge.version },
                });
                return version;
            })(),
            new Promise((resolve) => {
                setTimeout(() => resolve(false), timeout);
            }),
        ]);

        if (version === false) {
            throw new Error(
                'Error: AsyncBridge.sync timeout. AsyncBridge was not able to receive response from the other side.',
            );
        }

        return {
            version: bridge.version,
            otherSideVersion: version,
        };
    };

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

const loggerMiddleware = (() => (next) => (action) => {
    Logger.log('action:', action);
    return next(action);
}) as Middleware;

const asyncMiddleware = (() => {
    const awaitMap = {};

    return (next) => (action) => {
        // returning promise for async request action
        if (action?.meta?.async && action?.meta?.type === ActionMetaType.REQUEST && !action?.meta?.external) {
            const id = action?.id;

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
        } else if (action?.meta?.type === ActionMetaType.RESPONSE && action?.meta?.external) {
            const id = action?.meta?.id;

            if (awaitMap[id]) {
                if (!action.meta.error) {
                    awaitMap[id].resolve(action.payload);
                } else {
                    awaitMap[id].reject(action.payload);
                }
            } else {
                return next(action);
            }
        } else {
            return next(action);
        }
    };
}) as Middleware;

export function createAsyncBridge(options: BridgeOptions = {}, middlewares: Array<Middleware> = []): Bridge {
    return createBridge(options, [asyncMiddleware, ...middlewares]);
}
