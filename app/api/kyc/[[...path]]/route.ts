import {legacy} from '../../../../server/platform/http.mjs';
import {handleKYC} from '../../../../server/kyc.mjs';
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const maxDuration=60;
const h=legacy('kyc',(r:Request,env:any)=>handleKYC(r,env));
export {h as GET,h as POST};
