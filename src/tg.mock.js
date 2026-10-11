export const API_ID=1, API_HASH=''
export let me={firstName:'Amit',lastName:'Sami',username:'amitsami'}
export const normPath=(p)=>'/'+String(p||'/').split('/').filter(Boolean).join('/')
const now=Date.now()/1000
const F=(id,name,path,size,mime,extra={})=>({kind:'file',id,name,path,size,mime,date:now-id*86400,hasThumb:false,msg:{date:now-id*3600},...extra})
let items=[{kind:'folder',id:100,path:'/Documents',d:0,date:now},{kind:'folder',id:101,path:'/Research',d:0,date:now},{kind:'folder',id:102,path:'/Photos',d:0,date:now},{kind:'folder',id:103,path:'/Backups',d:0,date:now},
F(1,'Project Plan.pdf','/',2.4e6,'application/pdf',{fav:true}),F(2,'Contract Draft.docx','/',380e3,'application/msword'),F(3,'Budget 2026.xlsx','/',96e3,''),F(4,'Presentation.mp4','/',845e6,'video/mp4',{duration:312}),F(5,'Thesis Slides.pptx','/',12e6,''),F(6,'archive.zip','/',1.2e9,''),F(7,'notes.md','/Research',4e3,'text/markdown'),F(8,'NIDS dataset.csv','/Research',58e6,'text/csv'),F(9,'Song.mp3','/',7e6,'audio/mpeg'),F(10,'old.txt','/',1e3,'text/plain',{d:now-3600})]
export async function initClient(){return true} export async function getMe(){return me} export async function ensureChannel(){}
export async function listAll(){await new Promise(r=>setTimeout(r,300));return items}
export async function editItem(){} export async function createFolder(path){return {kind:'folder',id:Math.random(),path,d:0,date:now}} export async function deleteIds(){}
export const MAX_SIZE=()=>2e9
export async function uploadFile(file,path,{onProgress}){for(let i=1;i<=10;i++){await new Promise(r=>setTimeout(r,80));onProgress(i/10,file.size*i/10)}return F(Math.floor(Math.random()*1e6),file.name,path,file.size,file.type)}
export async function downloadBlob(){return new Blob(['hello'])} export async function* downloadChunks(){} export async function downloadThumb(){return null}
export async function logout(){} export async function qrLogin(){} export async function sendCode(){} export async function signIn(){} export async function passwordHint(){} export async function checkPassword(){}
