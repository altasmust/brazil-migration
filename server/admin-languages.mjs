export function validateLanguages(values){
 if(!values.catalog)return values;
 const fail=message=>{throw Object.assign(new Error(message),{status:400})};let list,texts;
 try{list=JSON.parse(values.catalog);texts=JSON.parse(values.texts||'{}')}catch{fail('Geçersiz dil verisi.');}
 if(!Array.isArray(list)||!list.length||list.length>100)fail('1–100 dil tanımlayabilirsiniz.');
 const codes=new Set();for(const l of list){if(!l||typeof l.name!=='string'||!l.name.trim()||l.name.length>80||! /^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,2}$/.test(l.code||'')||typeof l.active!=='boolean')fail('Dil adı, kodu veya durumu geçersiz.');if(codes.has(l.code))fail('Dil kodu zaten mevcut.');codes.add(l.code);}
 if(!list.some(l=>l.code===values.default&&l.active))fail('Varsayılan dil mevcut ve aktif olmalıdır.');
 if(!texts||typeof texts!=='object'||Array.isArray(texts))fail('Dil metinleri geçersiz.');
 for(const [code,entries]of Object.entries(texts)){if(!codes.has(code)||!entries||typeof entries!=='object'||Array.isArray(entries))fail('Metinlerin dil kodunu kontrol edin.');for(const [key,value]of Object.entries(entries)){if(!key.trim()||key.length>100||['__proto__','constructor','prototype'].includes(key)||typeof value!=='string'||value.length>2000)fail('Metin anahtarı veya içeriği geçersiz.');}}
 return values;
}
