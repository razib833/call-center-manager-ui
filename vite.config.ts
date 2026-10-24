import {defineConfig} from 'vitest/config';
import {loadEnv} from 'vite';
export default defineConfig(({mode})=>{const apiTarget=loadEnv(mode,'.','VITE_MANAGER_').VITE_MANAGER_API_TARGET||'http://localhost:7246';return {base:'/manager/',server:{host:'127.0.0.1',port:5174,strictPort:true,proxy:{'/api':{target:apiTarget,changeOrigin:false},'/health':{target:apiTarget,changeOrigin:false}}},test:{environment:'jsdom',setupFiles:['./tests/setup.ts'],include:['tests/**/*.test.ts','tests/**/*.test.tsx'],maxWorkers:1}};});
