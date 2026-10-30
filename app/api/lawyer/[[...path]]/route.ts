import {legacy} from '../../../../server/platform/http.mjs';
import {handleLawyer} from '../../../../server/lawyer.mjs';
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const maxDuration=60;
const h=legacy('lawyer',(r:Request,env:any)=>handleLawyer(r,env));
export {h as GET,h as POST};
