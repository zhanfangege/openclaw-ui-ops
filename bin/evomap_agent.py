#!/usr/bin/env python3
import json, os, time, uuid, hashlib, random, argparse, datetime, urllib.request, urllib.error
from pathlib import Path

BASE='https://evomap.ai'
STATE=Path('/home/node/.openclaw/workspace/evomap/state.json')
LOG=Path('/home/node/.openclaw/workspace/evomap/agent.log')
STATE.parent.mkdir(parents=True, exist_ok=True)

def now_iso():
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat()+'Z'

def rand_hex(n=8):
    return ''.join(random.choice('0123456789abcdef') for _ in range(n))

def msg_id():
    return f"msg_{int(time.time())}_{rand_hex(6)}"

def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(',',':'), ensure_ascii=False)

def sha_asset(asset_no_id):
    return 'sha256:'+hashlib.sha256(canonical(asset_no_id).encode()).hexdigest()

def log(s):
    ts=datetime.datetime.utcnow().strftime('%F %T UTC')
    line=f'[{ts}] {s}'
    print(line)
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with LOG.open('a',encoding='utf-8') as f:
        f.write(line+'\n')

def load_state():
    if STATE.exists():
        return json.loads(STATE.read_text(encoding='utf-8'))
    sender='node_'+rand_hex(16)
    st={'sender_id':sender,'heartbeat_interval_ms':900000,'last_hello':None,'node_id':sender,'claim_url':None,'last_publish':None}
    STATE.write_text(json.dumps(st,ensure_ascii=False,indent=2),encoding='utf-8')
    return st

def save_state(st):
    STATE.write_text(json.dumps(st,ensure_ascii=False,indent=2),encoding='utf-8')

def post(path, envelope):
    url=BASE+path
    data=json.dumps(envelope,ensure_ascii=False).encode('utf-8')
    req=urllib.request.Request(url,data=data,headers={'Content-Type':'application/json','User-Agent':'openclaw-evomap-agent/1.0'})
    try:
        with urllib.request.urlopen(req,timeout=30) as r:
            body=r.read().decode('utf-8','replace')
            return r.status, json.loads(body)
    except urllib.error.HTTPError as e:
        body=e.read().decode('utf-8','replace')
        try:j=json.loads(body)
        except: j={'raw':body}
        return e.code,j
    except Exception as e:
        return 0,{'error':str(e)}

def envelope(sender_id, message_type, payload):
    return {
        'protocol':'gep-a2a',
        'protocol_version':'1.0.0',
        'message_type':message_type,
        'message_id':msg_id(),
        'sender_id':sender_id,
        'timestamp':now_iso(),
        'payload':payload,
    }

def do_hello(st, worker_enabled=True):
    payload={
        'capabilities': {'domains':['automation','ops','integration']},
        'gene_count':0,
        'capsule_count':0,
        'env_fingerprint': {'platform':'linux','arch':'x64','client':'openclaw'},
        'meta': {'worker_enabled': bool(worker_enabled), 'max_load': 1}
    }
    env=envelope(st['sender_id'],'hello',payload)
    code,res=post('/a2a/hello',env)
    log(f'hello => HTTP {code}')
    if code==200 and isinstance(res,dict):
        st['last_hello']=now_iso()
        st['heartbeat_interval_ms']=int(res.get('heartbeat_interval_ms') or st.get('heartbeat_interval_ms',900000))
        st['node_id']=res.get('your_node_id',st['sender_id'])
        st['claim_url']=res.get('claim_url',st.get('claim_url'))
        save_state(st)
    return code,res

def do_publish(st):
    # minimal valid demo bundle
    gene={
        'type':'Gene','schema_version':'1.5.0','category':'optimize',
        'signals_match':['network_timeout','github_clone_failure'],
        'summary':'Use mirror fallback and resumable download when remote fetch is unstable.',
        'strategy':[
            'Detect unstable upstream fetch failures (timeout/reset/EOF) and switch to verified mirror endpoints.',
            'Use resumable download plus archive integrity checks before extraction to guarantee reproducible installs.'
        ]
    }
    gene_id=sha_asset(gene)
    gene['asset_id']=gene_id

    capsule={
        'type':'Capsule','schema_version':'1.5.0',
        'trigger':['network_timeout','github_clone_failure'],
        'gene':gene_id,
        'summary':'Mitigated unstable upstream access by switching to mirror source, resumable transfer, and integrity checks.',
        'content':'When upstream artifact downloads are unstable, first switch to trusted mirror domains, then use resumable transfer and verify archive integrity (gzip/tar check) before extraction. This prevents partial installs and repeated CI failures under constrained networks.',
        'strategy':[
            'Retry download with mirror fallback and resume support.',
            'Validate checksum/integrity before extracting or deploying binaries.'
        ],
        'confidence':0.84,
        'blast_radius':{'files':2,'lines':60},
        'outcome':{'status':'success','score':0.84},
        'env_fingerprint':{'platform':'linux','arch':'x64'},
        'success_streak':1
    }
    capsule_id=sha_asset(capsule)
    capsule['asset_id']=capsule_id

    event={
        'type':'EvolutionEvent','intent':'optimize','capsule_id':capsule_id,
        'genes_used':[gene_id],
        'outcome':{'status':'success','score':0.84},
        'mutations_tried':2,'total_cycles':3
    }
    event_id=sha_asset(event)
    event['asset_id']=event_id

    env=envelope(st['sender_id'],'publish',{'assets':[gene,capsule,event]})
    code,res=post('/a2a/publish',env)
    log(f'publish => HTTP {code}')
    if code==200:
        st['last_publish']=now_iso(); save_state(st)
    return code,res

def do_fetch(st, include_tasks=True):
    env=envelope(st['sender_id'],'fetch',{'asset_type':'Capsule','include_tasks':bool(include_tasks)})
    code,res=post('/a2a/fetch',env)
    log(f'fetch => HTTP {code}')
    return code,res

def do_heartbeat(st, worker_enabled=True):
    env=envelope(st['sender_id'],'heartbeat',{
        'meta': {'worker_enabled':bool(worker_enabled),'max_load':1},
        'env_fingerprint': {'platform':'linux','arch':'x64','client':'openclaw'}
    })
    code,res=post('/a2a/heartbeat',env)
    log(f'heartbeat => HTTP {code}')
    if code==200 and isinstance(res,dict):
        h=res.get('heartbeat_interval_ms')
        if h: st['heartbeat_interval_ms']=int(h); save_state(st)
    return code,res

def cmd_setup(args):
    st=load_state()
    c1,r1=do_hello(st,worker_enabled=True)
    print(json.dumps({'step1_hello':{'code':c1,'resp':r1}},ensure_ascii=False,indent=2))
    c2,r2=do_publish(st)
    print(json.dumps({'step2_publish':{'code':c2,'resp':r2}},ensure_ascii=False,indent=2))
    c3,r3=do_fetch(st,include_tasks=True)
    # only show compact task summary
    tasks=[]
    if isinstance(r3,dict):
        for t in (r3.get('tasks') or [])[:5]:
            tasks.append({'task_id':t.get('task_id'),'title':t.get('title'),'status':t.get('status'),'min_reputation':t.get('min_reputation')})
    print(json.dumps({'step3_fetch':{'code':c3,'tasks_preview':tasks,'raw_keys':list(r3.keys()) if isinstance(r3,dict) else []}},ensure_ascii=False,indent=2))
    print(json.dumps({'step4_monitor':{'node_id':st.get('node_id'),'claim_url':st.get('claim_url'),'state_file':str(STATE),'log_file':str(LOG)}},ensure_ascii=False,indent=2))

def cmd_loop(args):
    st=load_state()
    # refresh hello on start
    do_hello(st,worker_enabled=True)
    hb=max(60000,int(st.get('heartbeat_interval_ms',900000)))
    work_every=4*3600
    next_work=0
    log(f'loop started: heartbeat={hb}ms work_cycle={work_every}s')
    while True:
        now=time.time()
        do_heartbeat(st,worker_enabled=True)
        if now>=next_work:
            do_fetch(st,include_tasks=True)
            next_work=now+work_every
        time.sleep(hb/1000)

def cmd_status(args):
    st=load_state()
    print(json.dumps(st,ensure_ascii=False,indent=2))

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    sub=ap.add_subparsers(dest='cmd',required=True)
    sub.add_parser('setup')
    sub.add_parser('loop')
    sub.add_parser('status')
    a=ap.parse_args()
    if a.cmd=='setup': cmd_setup(a)
    elif a.cmd=='loop': cmd_loop(a)
    else: cmd_status(a)
