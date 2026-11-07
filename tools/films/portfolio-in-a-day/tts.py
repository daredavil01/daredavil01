import asyncio, json, edge_tts, sys
V="en-IN-NeerjaExpressiveNeural"
async def one(s):
    c=edge_tts.Communicate(s["text"],V,rate="+10%",boundary="WordBoundary")
    words=[];f=open(f"vo/{s['id']}.mp3","wb")
    async for ch in c.stream():
        if ch["type"]=="audio": f.write(ch["data"])
        elif ch["type"]=="WordBoundary": words.append([ch["text"],ch["offset"]/1e7,ch["duration"]/1e7])
    f.close(); return words
async def main():
    sc=json.load(open("script.json")); out={}
    for s in sc: out[s["id"]]=await one(s)
    json.dump(out,open("vo/words.json","w"),indent=0)
asyncio.run(main())
