import {legacy} from '../../../server/platform/http.mjs';
import {heartbeat} from '../../../server/visitors.mjs';
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const maxDuration=60;
export const POST=legacy('visitors',(r:Request,env:any)=>heartbeat(r,env));
