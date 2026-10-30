import {legacy} from '../../../../server/platform/http.mjs';
import {handle} from '../../../../server/admin.mjs';
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const maxDuration=60;
const h=legacy('admin',(r:Request,env:any)=>handle(r,env));
export {h as GET,h as POST,h as DELETE,h as PATCH};
