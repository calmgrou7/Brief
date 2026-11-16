import sys,json,soundfile as sf,sherpa_onnx as so
d=sys.argv[1]
r=so.OfflineRecognizer.from_transducer(encoder=d+"/encoder-epoch-99-avg-1.int8.onnx",decoder=d+"/decoder-epoch-99-avg-1.onnx",joiner=d+"/joiner-epoch-99-avg-1.int8.onnx",tokens=d+"/tokens.txt",num_threads=4)
a,sr=sf.read(sys.argv[2],dtype="float32")
# chunk by speech segments
segs=json.loads(sys.argv[3]); out=[]
for s,e in segs:
    st=r.create_stream(); st.accept_waveform(sr,a[int(max(0,s-0.15)*sr):int((e+0.15)*sr)]); r.decode_stream(st)
    res=st.result; out.append({"s":s,"e":e,"t":res.text,"tok":list(zip(res.tokens,[x+max(0,s-0.15) for x in res.timestamps]))})
    print(f"{s:6.2f}-{e:6.2f} {res.text}")
json.dump(out,open(sys.argv[4],"w"),ensure_ascii=False)
