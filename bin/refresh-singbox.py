#!/usr/bin/env python3
import base64, json, os, sys, urllib.parse, urllib.request
from pathlib import Path

URLS = [
  'https://github.chenc.dev/gist.githubusercontent.com/zhanfangege/1505f4bfd1c1ddf7cea811d80399319e/raw/base64.txt',
  'https://goto.imcfan.cn/4c562dba-404e-4ac2-b8e7-037f227e60e9?base64',
]

OUT = Path('/home/node/.openclaw/workspace/sing-box/config.json')
OUT.parent.mkdir(parents=True, exist_ok=True)

def b64decode_loose(s:str)->str:
    s=s.strip()
    s += '='*((4-len(s)%4)%4)
    return base64.b64decode(s).decode('utf-8','replace')

def fetch_lines(url):
    req=urllib.request.Request(url,headers={'User-Agent':'openclaw'})
    with urllib.request.urlopen(req,timeout=20) as r:
        raw=r.read().decode('utf-8','replace').strip()
    txt=b64decode_loose(raw)
    return [x.strip() for x in txt.splitlines() if x.strip()]

def parse_vless(uri, idx):
    u=urllib.parse.urlparse(uri)
    if u.scheme!='vless':
        return None
    uuid=u.username or ''
    server=u.hostname
    port=u.port
    if not (uuid and server and port):
        return None
    q=urllib.parse.parse_qs(u.query)
    def q1(k,d=''):
        return (q.get(k,[d])[0] or d)
    network=q1('type','tcp')
    security=q1('security','none')
    tag=f'node-{idx}-{server}:{port}'
    o={
      'type':'vless','tag':tag,'server':server,'server_port':int(port),
      'uuid':uuid,'packet_encoding':'xudp'
    }
    flow=q1('flow','')
    if flow: o['flow']=flow

    if network=='ws':
        o['transport']={'type':'ws'}
        path=q1('path','/')
        host=q1('host','')
        h={}
        if host: h['Host']=host
        o['transport']['path']=path
        if h: o['transport']['headers']=h
    elif network in ('tcp','raw'):
        pass
    else:
        return None

    if security=='tls':
        tls={'enabled':True}
        sni=q1('sni','')
        if sni: tls['server_name']=sni
        alpn=q1('alpn','')
        if alpn: tls['alpn']=[x for x in alpn.split(',') if x]
        fp=q1('fp','')
        if fp:
            tls['utls']={'enabled':True,'fingerprint':fp}
        o['tls']=tls
    elif security=='reality':
        tls={'enabled':True,'reality':{'enabled':True}}
        sni=q1('sni','')
        if sni: tls['server_name']=sni
        pbk=q1('pbk','')
        sid=q1('sid','')
        fp=q1('fp','')
        if pbk: tls['reality']['public_key']=pbk
        if sid: tls['reality']['short_id']=sid
        if fp: tls['utls']={'enabled':True,'fingerprint':fp}
        o['tls']=tls
    elif security in ('none',''):
        pass
    else:
        return None
    return o

all_lines=[]
for url in URLS:
    try:
        all_lines.extend(fetch_lines(url))
    except Exception as e:
        print(f'WARN fetch failed: {url}: {e}', file=sys.stderr)

# dedupe by full uri
seen=set(); lines=[]
for l in all_lines:
    if l not in seen:
        seen.add(l); lines.append(l)

outbounds=[]
for i,l in enumerate(lines,1):
    if l.startswith('vless://'):
        o=parse_vless(l,i)
        if o: outbounds.append(o)

if not outbounds:
    print('ERROR: no valid outbounds parsed', file=sys.stderr)
    sys.exit(2)

config={
  'log':{'level':'warn'},
  'dns':{'servers':[{'tag':'local','address':'223.5.5.5','detour':'select'},{'tag':'local2','address':'1.1.1.1','detour':'select'}]},
  'inbounds':[{'type':'mixed','tag':'mixed-in','listen':'127.0.0.1','listen_port':7890}],
  'outbounds':[
    {'type':'selector','tag':'select','outbounds':[o['tag'] for o in outbounds],'default':outbounds[0]['tag']},
    {'type':'urltest','tag':'auto','outbounds':[o['tag'] for o in outbounds],'url':'https://www.gstatic.com/generate_204','interval':'10m'},
    *outbounds,
    {'type':'direct','tag':'direct'},
    {'type':'block','tag':'block'}
  ],
  'route':{'final':'auto'}
}

OUT.write_text(json.dumps(config,ensure_ascii=False,indent=2))
print(f'generated {OUT} with {len(outbounds)} outbounds from {len(lines)} links')
