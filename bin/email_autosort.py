#!/usr/bin/env python3
import imaplib,re,email,datetime
from email.header import decode_header
from pathlib import Path

EMAIL='cfan@qq.com'
HOST='imap.qq.com'
PORT=993
SECRET=Path('/home/node/.openclaw/secrets/qq_smtp_pass')

FOLDERS=['01-TODO','03-BILLING','04-CODES','99-ARCHIVE']

KW_BILL=['账单','发票','付款','支付','对账','收据','invoice','receipt']
KW_CODE=['验证码','verification code','登录提醒','security alert','动态码']
KW_ACTION=['请回复','需要处理','action required','待办','审批','review','confirm','行动']


def dh(s:str)->str:
    if not s:
        return ''
    out=''
    for part,enc in decode_header(s):
        if isinstance(part,bytes):
            e=(enc or 'utf-8').lower() if isinstance(enc,str) else 'utf-8'
            if e in ('unknown-8bit','x-unknown','unknown'):
                e='utf-8'
            try:
                out += part.decode(e,'replace')
            except Exception:
                out += part.decode('utf-8','replace')
        else:
            out += part
    return out


def load_pass()->str:
    raw=SECRET.read_text(encoding='utf-8').strip()
    m=re.search(r"QQ_SMTP_PASS='([^']+)'",raw)
    return m.group(1) if m else raw


def classify(sub:str, frm:str)->str:
    text=(sub+' '+frm).lower()
    if any(k.lower() in text for k in KW_BILL):
        return '03-BILLING'
    if any(k.lower() in text for k in KW_CODE):
        return '04-CODES'
    if any(k.lower() in text for k in KW_ACTION):
        return '01-TODO'
    return '99-ARCHIVE'


def main():
    pwd=load_pass()
    M=imaplib.IMAP4_SSL(HOST,PORT)
    M.login(EMAIL,pwd)
    M.select('INBOX', readonly=False)

    for f in FOLDERS:
        try:
            M.create(f)
        except Exception:
            pass

    typ,data=M.search(None,'ALL')
    ids=(data[0].split() if data and data[0] else [])

    stats={k:0 for k in FOLDERS}
    moved=0
    for i in reversed(ids):
        typ,msg=M.fetch(i,b'(BODY.PEEK[HEADER.FIELDS (SUBJECT FROM)])')
        if typ!='OK' or not msg or not msg[0] or not isinstance(msg[0],tuple):
            continue
        mobj=email.message_from_bytes(msg[0][1])
        sub=dh(mobj.get('Subject','')).strip()
        frm=dh(mobj.get('From','')).strip()
        folder=classify(sub,frm)
        ctyp,_=M.copy(i,folder)
        if ctyp=='OK':
            M.store(i,b'+FLAGS',b'\\Deleted')
            stats[folder]+=1
            moved+=1

    M.expunge()
    M.logout()

    ts=datetime.datetime.utcnow().strftime('%F %T UTC')
    print(f'[{ts}] EMAIL_AUTOSORT_OK moved={moved} stats={stats}')


if __name__=='__main__':
    main()
