import {after} from 'next/server';
import {platform} from '../../../../server/platform/http.mjs';
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const maxDuration=60;
const h=platform('member',after);
export {h as GET,h as POST};
