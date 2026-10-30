import {legacy} from '../../../server/platform/http.mjs';
import {referral} from '../../../server/workspace.mjs';
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const maxDuration=60;
export const GET=legacy('r',(r:Request,env:any,p:any)=>referral(r,env,p.code));
