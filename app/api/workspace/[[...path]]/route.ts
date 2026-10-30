import {after} from 'next/server';
import {legacy} from '../../../../server/platform/http.mjs';
import {handle} from '../../../../server/workspace.mjs';
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const maxDuration=60;
const h=legacy('workspace',(r:Request,env:any)=>handle(r,env),{after});
export {h as GET,h as POST,h as PATCH};
