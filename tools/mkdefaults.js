// server/defaults.json для админки: значения по умолчанию из src/p2.js. Запуск из корня: node tools/mkdefaults.js
const fs=require('fs'),R=__dirname+'/..';
const DEF=new Function(fs.readFileSync(R+'/src/p2.js','utf8')+';return DEF;')();
const icons=JSON.parse(fs.readFileSync(R+'/src/iconmap.txt','utf8'));
let meta={};try{meta=JSON.parse(fs.readFileSync(R+'/tools/adm/meta.json','utf8'));}catch(e){}
let orig={};try{orig=JSON.parse(fs.readFileSync(R+'/tools/m2x/orig.json','utf8'));}catch(e){}
fs.writeFileSync(R+'/server/defaults.json',JSON.stringify({def:DEF,icons,orig,desc:meta.desc||{},treeBg:meta.treeBg||{},metaIcon:meta.metaIcon||{}}));
