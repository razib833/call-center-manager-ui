import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const document=JSON.parse(readFileSync(new URL('../../Api/src/Customer360.Api/OpenApi/openapi.json',import.meta.url),'utf8'));
const schemas=document.components.schemas;
function type(s){if(s.$ref)return s.$ref.split('/').at(-1);if(s.type==='array')return `(${type(s.items)})[]`;if(s.type==='integer'||s.type==='number')return 'number';if(s.type==='boolean')return 'boolean';if(s.type==='string')return 'string';return 'Record<string, unknown>';}
let source='// Generated from the existing API OpenAPI document. Do not edit by hand.\n';
for(const [name,s] of Object.entries(schemas)){
 if(!/^(Ticket_|Dashboard_|Priority_Get|TicketStatus_Get|SessionView|CsrfToken)/.test(name))continue;
 source+=`export interface ${name} {\n`;
 for(const [key,p] of Object.entries(s.properties||{})){const required=s.required?.includes(key);source+=` ${JSON.stringify(key)}${required?'':'?'}: ${type(p)}${required?'':' | null'};\n`;}
 source+='}\n';
}
mkdirSync(new URL('../src/',import.meta.url),{recursive:true});writeFileSync(new URL('../src/contracts.ts',import.meta.url),source);
