declare enum ActionMetaType {
    REQUEST = "request",
    RESPONSE = "response"
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
type Middleware = (bridge: Bridge) => (next: (action: Action) => Promise<any>) => (action: Action) => Promise<any>;
export declare function compose(...funcs: any[]): any;
export declare function createAsyncBridge(options?: BridgeOptions, middlewares?: Array<Middleware>): Bridge;
export {};
