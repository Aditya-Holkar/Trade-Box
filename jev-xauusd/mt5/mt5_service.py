from __future__ import annotations
import os
from typing import Optional
import MetaTrader5 as mt5
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

HOST=os.getenv("MT5_BRIDGE_HOST","127.0.0.1")
PORT=int(os.getenv("MT5_BRIDGE_PORT","8765"))
DEFAULT_SYMBOL=os.getenv("MT5_SYMBOL","XAUUSD")
MT5_PATH=os.getenv("MT5_PATH","")
BRIDGE_TOKEN=os.getenv("MT5_BRIDGE_TOKEN","")

app=FastAPI(title="Standalone Jev XAUUSD MT5 Bridge",version="1.1.0")

@app.middleware("http")
async def bridge_auth(request: Request, call_next):
    if BRIDGE_TOKEN and request.headers.get("X-MT5-Bridge-Token") != BRIDGE_TOKEN:
        return __import__("fastapi").responses.JSONResponse({"detail":"Unauthorized MT5 bridge request"},status_code=401)
    return await call_next(request)

TIMEFRAMES={"M1":mt5.TIMEFRAME_M1,"M5":mt5.TIMEFRAME_M5,"M15":mt5.TIMEFRAME_M15,"M30":mt5.TIMEFRAME_M30,"H1":mt5.TIMEFRAME_H1,"H4":mt5.TIMEFRAME_H4,"D1":mt5.TIMEFRAME_D1}

class OrderRequest(BaseModel):
    symbol:str
    side:str
    volume:float
    sl:Optional[float]=None
    tp:Optional[float]=None
    deviation:int=20
    comment:str="Jev XAUUSD"

def initialize_mt5():
    if mt5.terminal_info() is not None:return True
    ok=mt5.initialize(path=MT5_PATH) if MT5_PATH else mt5.initialize()
    if not ok:raise RuntimeError(f"MT5 initialization failed: {mt5.last_error()}")
    return True

def ensure_symbol(symbol:str):
    initialize_mt5()
    info=mt5.symbol_info(symbol)
    if info is None:raise HTTPException(status_code=404,detail=f"MT5 symbol not found: {symbol}")
    if not info.visible and not mt5.symbol_select(symbol,True):raise HTTPException(status_code=500,detail=f"Could not select symbol: {symbol}")
    return info

@app.get("/health")
def health():
    try:
        initialize_mt5()
        terminal=mt5.terminal_info()
        account=mt5.account_info()
        return {"ok":terminal is not None,"symbol":DEFAULT_SYMBOL,"terminalConnected":terminal is not None,"accountLogin":account.login if account else None}
    except Exception as exc:
        return {"ok":False,"error":str(exc)}

@app.get("/tick/{symbol}")
def tick(symbol:str):
    ensure_symbol(symbol)
    d=mt5.symbol_info_tick(symbol)
    if d is None:raise HTTPException(status_code=500,detail=f"Could not read tick: {mt5.last_error()}")
    return {"time":int(d.time),"bid":float(d.bid),"ask":float(d.ask),"last":float(d.last),"volume":float(d.volume)}

@app.get("/candles/{symbol}")
def candles(symbol:str,timeframe:str="M5",count:int=500):
    ensure_symbol(symbol)
    tf=timeframe.upper()
    if tf not in TIMEFRAMES:raise HTTPException(status_code=400,detail="Unsupported timeframe")
    rates=mt5.copy_rates_from_pos(symbol,TIMEFRAMES[tf],0,max(10,min(count,5000)))
    if rates is None:raise HTTPException(status_code=500,detail=f"Could not retrieve candles: {mt5.last_error()}")
    return {"symbol":symbol,"timeframe":tf,"candles":[{"time":int(r["time"]),"open":float(r["open"]),"high":float(r["high"]),"low":float(r["low"]),"close":float(r["close"]),"tickVolume":int(r["tick_volume"]),"spread":int(r["spread"])} for r in rates]}

@app.get("/account")
def account():
    initialize_mt5()
    info=mt5.account_info()
    if info is None:raise HTTPException(status_code=500,detail=f"Could not read account: {mt5.last_error()}")
    return {"login":int(info.login),"balance":float(info.balance),"equity":float(info.equity),"profit":float(info.profit),"margin":float(info.margin),"freeMargin":float(info.margin_free),"currency":str(info.currency)}

@app.get("/positions")
def positions(symbol:Optional[str]=None):
    initialize_mt5()
    raw=mt5.positions_get(symbol=symbol) if symbol else mt5.positions_get()
    return {"positions":[] if raw is None else [{"ticket":int(p.ticket),"symbol":str(p.symbol),"type":"buy" if p.type==mt5.POSITION_TYPE_BUY else "sell","volume":float(p.volume),"priceOpen":float(p.price_open),"priceCurrent":float(p.price_current),"profit":float(p.profit),"sl":float(p.sl),"tp":float(p.tp)} for p in raw]}

@app.post("/order")
def order(req:OrderRequest):
    info=ensure_symbol(req.symbol)
    side=req.side.lower()
    if side not in ("buy","sell") or req.volume<=0:raise HTTPException(status_code=400,detail="Invalid side or volume")
    tick=mt5.symbol_info_tick(req.symbol)
    if tick is None:raise HTTPException(status_code=500,detail="Could not read current tick")
    order_type=mt5.ORDER_TYPE_BUY if side=="buy" else mt5.ORDER_TYPE_SELL
    price=float(tick.ask if side=="buy" else tick.bid)
    volume=max(float(info.volume_min),min(float(info.volume_max),float(req.volume)))
    step=float(info.volume_step)
    if step>0:volume=round(volume/step)*step
    digits=int(info.digits)
    sl=round(req.sl,digits) if req.sl is not None else 0.0
    tp=round(req.tp,digits) if req.tp is not None else 0.0
    request={"action":mt5.TRADE_ACTION_DEAL,"symbol":req.symbol,"volume":volume,"type":order_type,"price":price,"sl":sl,"tp":tp,"deviation":int(req.deviation),"magic":2601003,"comment":req.comment,"type_time":mt5.ORDER_TIME_GTC,"type_filling":mt5.ORDER_FILLING_IOC}
    check=mt5.order_check(request)
    if check is None:return {"success":False,"error":f"order_check failed: {mt5.last_error()}"}
    result=mt5.order_send(request)
    if result is None:return {"success":False,"error":str(mt5.last_error())}
    success=result.retcode in (mt5.TRADE_RETCODE_DONE,mt5.TRADE_RETCODE_PLACED,mt5.TRADE_RETCODE_DONE_PARTIAL)
    return {"success":bool(success),"retcode":int(result.retcode),"order":int(result.order),"deal":int(result.deal),"price":float(result.price),"volume":float(result.volume),"comment":str(result.comment)}

@app.on_event("shutdown")
def shutdown():
    mt5.shutdown()

if __name__=="__main__":
    import uvicorn
    initialize_mt5()
    uvicorn.run(app,host=HOST,port=PORT)
