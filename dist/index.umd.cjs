(function(y,u){typeof exports=="object"&&typeof module<"u"?u(exports,require("uuid-random")):typeof define=="function"&&define.amd?define(["exports","uuid-random"],u):(y=typeof globalThis<"u"?globalThis:y||self,u(y.AsyncBridge={},y.uuid))})(this,function(y,u){"use strict";const B="1.2.0";function q(...r){return r.length===0?n=>n:(r=r.filter(n=>typeof n=="function"),r.length===1?r[0]:r.reduce((n,t)=>(...i)=>n(t(...i))))}const w=(()=>{const r="[webview-bridge]";return{log:(...n)=>console.log(r,...n),warn:(...n)=>console.warn(r,...n),error:(...n)=>console.error(r,...n)}})(),C=r=>{w.error(`Cannot make a response. To be able to response to action '${r.type}' please dispatch it using 'dispatchAsync' bridge method.`)},D=(r,n)=>w.warn(`Cannot dispatch action '${n.type}. 'Please provide post message implementation calling 'bridge.setPostMessage' first.`),x="@@INTERNAL_SYNC_MESSAGE",T=(r,n)=>{let t=(r==null?void 0:r.postMessage)??D,i=[];const v=e=>(i.push(e),()=>{i=i.filter(s=>s!==e)});let c={};const f=(e,s)=>{const a=u();return c[e]=c[e]??{},c[e][a]=s,()=>{delete c[e][a]}},b=e=>{const{meta:s,type:a}=e;if(!s.external)try{const o=JSON.stringify(e);t(o,e)}catch(o){throw o}if(s.type==="request"&&s.external&&c[a]){let o=!1;const h=d=>{const{type:A=e.type,payload:M,meta:P}=d??{};if(o){w.warn("You're trying to resolve async request that is already done.");return}o=!0,N({type:A,payload:M,meta:{...P,id:e.id}})},I=d=>{if(o){w.warn("You're trying to reject async request that is already done.");return}o=!0;const A=d instanceof Error,M=typeof d=="string",P=!(A||M||!d),{type:U,payload:V,meta:F={}}=P?d:{};let E;switch(!0){case A:E={message:d.toString()};break;case M:E={message:d};break;default:E=V}N({type:U??e.type,payload:E,meta:{...F,id:e.id,error:!0}})},j=()=>C(e),J=s.async?h:j,$=s.async?I:j;Object.values(c[a]).forEach(d=>d(e,J,$))}};let l={};const S=[()=>e=>s=>(i.forEach(a=>{a(s)}),e(s)),...n].map(e=>e(l)),g=q(...S)(b),m=e=>{const{type:s,payload:a={}}=e,o=u(),h={...e.meta??{},external:!1,type:"request"};return g({id:o,type:s,payload:a,meta:h})},N=e=>{const{type:s,payload:a={},meta:o={}}=e,h=u();return g({id:h,type:s,payload:a,meta:{...o,external:!1,type:"response"}})},O=e=>m({...e,meta:{...e.meta??{},async:!0}}),Y=e=>g({...e,meta:{...e.meta??{},external:!0}}),_=e=>{try{const s=typeof e=="string"?JSON.parse(e):e;Y(s)}catch(s){throw s}},z=e=>{t=e},G=async(e=5e3)=>{const s=await Promise.race([(async()=>{const{version:a}=await l.dispatchAsync({type:x,payload:{version:l.version}});return a})(),new Promise(a=>{setTimeout(()=>a(!1),e)})]);if(s===!1)throw new Error("Error: AsyncBridge.sync timeout. AsyncBridge was not able to receive response from the other side.");return{version:l.version,otherSideVersion:s}};return f(x,({payload:e},s)=>{s({payload:{version:l.version}})}),l={version:B,sync:G,dispatch:m,dispatchAsync:O,setPostMessage:z,subscribe:v,onMessage:_,listenEvent:f},l},k=()=>{const r={};return n=>t=>{var i,v,c,f,b,l;if((i=t==null?void 0:t.meta)!=null&&i.async&&((v=t==null?void 0:t.meta)==null?void 0:v.type)==="request"&&!((c=t==null?void 0:t.meta)!=null&&c.external)){const p=t==null?void 0:t.id;return new Promise((S,g)=>{r[p]={resolve:m=>{S(m),delete r[p]},reject:m=>{g(m),delete r[p]}},n(t)})}else if(((f=t==null?void 0:t.meta)==null?void 0:f.type)==="response"&&((b=t==null?void 0:t.meta)!=null&&b.external)){const p=(l=t==null?void 0:t.meta)==null?void 0:l.id;if(r[p])t.meta.error?r[p].reject(t.payload):r[p].resolve(t.payload);else return n(t)}else return n(t)}};function L(r={},n=[]){return T(r,[k,...n])}y.compose=q,y.createAsyncBridge=L,Object.defineProperty(y,Symbol.toStringTag,{value:"Module"})});
//# sourceMappingURL=index.umd.cjs.map
