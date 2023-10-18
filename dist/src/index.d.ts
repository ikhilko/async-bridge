declare enum ActionMetaType {
    REQUEST = "request",
    RESPONSE = "response"
}
declare type ActionMeta = {
    type: ActionMetaType;
    external: boolean;
    async?: boolean;
    error?: boolean;
    id?: string;
};
declare type Action = {
    id?: string;
    type?: string;
    payload?: object | any;
    meta?: ActionMeta;
};
declare type DispatchFunction = (action: Action) => Promise<any>;
declare type MessageReceiveFunction = (message: string | object) => undefined | never;
declare type PostMessageHandler = (message: string, action: Action) => void | never;
declare type Bridge = {
    version: string;
    sync: any;
    dispatch: DispatchFunction;
    dispatchAsync: DispatchFunction;
    setPostMessage: (postMessage: PostMessageHandler) => void;
    subscribe: (listener: Function) => Function;
    onMessage: MessageReceiveFunction;
    listenEvent: (type: string, handler: Function) => Function;
};
declare type BridgeOptions = {
    postMessage?: PostMessageHandler;
};
declare type Middleware = (bridge: Bridge) => (next: (action: Action) => Promise<any>) => (action: Action) => Promise<any>;
export declare function compose(...funcs: any[]): any;
export declare function createAsyncBridge(options?: BridgeOptions, middlewares?: Array<Middleware>): Bridge;
export {};
