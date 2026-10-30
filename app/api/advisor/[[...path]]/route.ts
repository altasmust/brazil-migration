import {legacy} from '../../../../server/platform/http.mjs';
import {handleAdvisor} from '../../../../server/advisor.mjs';
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const maxDuration=60;
const h=legacy('advisor',(r:Request,env:any)=>handleAdvisor(r,env));
export {h as GET,h as POST};
