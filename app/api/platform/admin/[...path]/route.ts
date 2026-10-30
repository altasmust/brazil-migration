import {after} from 'next/server';
import {platform} from '../../../../../server/platform/http.mjs';
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const maxDuration=60;
const h=platform('admin',after);
export {h as GET,h as POST,h as PATCH,h as DELETE};
