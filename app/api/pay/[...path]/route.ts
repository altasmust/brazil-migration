import {pay} from '../../../../server/platform/http.mjs';
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const maxDuration=60;
const h=pay();
export {h as GET,h as POST};
