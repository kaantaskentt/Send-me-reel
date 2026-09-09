import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type OpenAI from "openai";
import { answerContent } from "../src/lib/local-conversation";
import type { Analysis } from "../src/lib/types";

const source = (id: string, overrides = {}) => ({ id, status: "done", source_url: `https://example.com/${id}`, platform: "web", metadata: { title: `Source ${id}` }, transcript: null, caption: null, visual_summary: null, frame_descriptions: [], ...overrides }) as unknown as Analysis;
const call = (id: string, name: string, args: unknown) => ({ type:"function_call", call_id:id, name, arguments:JSON.stringify(args) });
const response = (output: unknown[], output_text = "") => ({ status:"completed", output, output_text, usage:{input_tokens:10,output_tokens:10} });
const final = (overrides = {}) => response([],JSON.stringify({answer:"These two sources complement each other.",suggestions:[],actions:[],evidence:[],sourceReferences:[],...overrides}));

test("the actual answer loop searches late evidence, reads a second source and validates its citation", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-chat-tools-"));
  try {
    await fs.mkdir(path.join(root,"library"));
    const current=source("current",{transcript:"Background. ".repeat(12000)+"Late silverfalcon uses frame indexing."});
    const saved=source("design",{visual_summary:"A silverfalcon design example",frame_descriptions:[{description:"Blue offset panels"}]});
    await fs.writeFile(path.join(root,"local-analysis.json"),JSON.stringify(current));
    await fs.writeFile(path.join(root,"library/design.json"),JSON.stringify(saved));
    let round=0;
    const client={responses:{create:async (request: {input:Array<{type?:string;call_id?:string;output?:string;content?:unknown}>})=>{
      const outputs=request.input.filter(item=>item.type==="function_call_output");
      if (round++===0) return response([call("search","search_source",{query:"silverfalcon"}),call("library","search_library",{query:"silverfalcon",cursor:0})]);
      if (round===2) {
        const searched=JSON.parse(outputs.find(item=>item.call_id==="search")!.output!);
        assert.ok(searched.hits.some((hit: {offset:number})=>hit.offset>100000));
        const library=JSON.parse(outputs.find(item=>item.call_id==="library")!.output!);
        assert.ok(library.matches.some((item: {analysisId:string})=>item.analysisId==="design"));
        return response([call("read","read_saved_source",{analysisId:"design",query:null})]);
      }
      const read=JSON.parse(outputs.find(item=>item.call_id==="read")!.output!);
      assert.equal(read.analysisId,"design");
      assert.equal(read.visualSummary,"A silverfalcon design example");
      return final({sourceReferences:[{analysisId:"design",evidence:[0,99]},{analysisId:"invented",evidence:[0]}]});
    }}} as unknown as Pick<OpenAI,"responses">;
    const answer=await answerContent(current,{version:1,analysisId:current.id,messages:[]},"Combine my silverfalcon sources",{client,studioRoot:root,workspace:{profile:{goal:"Create a portfolio"}}});
    assert.equal(answer.usage.calls,3);
    assert.ok(answer.activity.includes("Searched the full captured source"));
    assert.deepEqual(answer.reply.sourceReferences,[{analysisId:"design",title:"Source design",sourceUrl:"https://example.com/design",evidence:[0]}]);
    assert.equal(JSON.parse(await fs.readFile(path.join(root,"local-analysis.json"),"utf8")).id,"current");
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});

test("unread, malformed and a fourth saved source never enter a reply's secondary evidence", async () => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"contextdrop-chat-source-limit-"));
  try {
    await fs.mkdir(path.join(root,"library"));
    const current=source("current");
    await fs.writeFile(path.join(root,"local-analysis.json"),JSON.stringify(current));
    for(const id of ["one","two","three","four"]) await fs.writeFile(path.join(root,`library/${id}.json`),JSON.stringify(source(id)));
    let round=0;
    const client={responses:{create:async(request:{input:Array<{type?:string;call_id?:string;output?:string}>})=>{
      if(round++===0) return response([...["one","two","three","four"].map(id=>call(id,"read_saved_source",{analysisId:id,query:null})),call("escape","read_saved_source",{analysisId:"../secret",query:null})]);
      const output=request.input.filter(item=>item.type==="function_call_output");
      assert.match(JSON.parse(output.find(item=>item.call_id==="four")!.output!).error,/Three other sources/);
      assert.match(JSON.parse(output.find(item=>item.call_id==="escape")!.output!).error,/exact analysisId/);
      return final({sourceReferences:[{analysisId:"four",evidence:[]},{analysisId:"one",evidence:[]}]});
    }}} as unknown as Pick<OpenAI,"responses">;
    const result=await answerContent(current,{version:1,analysisId:current.id,messages:[]},"Read these saved sources",{client,studioRoot:root,workspace:{}});
    assert.deepEqual(result.reply.sourceReferences?.map(item=>item.analysisId),["one"]);
  } finally {await fs.rm(root,{recursive:true,force:true});}
});

test("a corrupt optional workspace does not break source Q&A or overwrite the saved file", async () => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"contextdrop-chat-corrupt-workspace-"));
  try {
    await fs.writeFile(path.join(root,"workspace.json"),"damaged data to preserve");
    const current=source("current",{caption:"A useful explanation"});
    const client={responses:{create:async(request:{input:unknown})=>{
      assert.match(JSON.stringify(request.input),/could not be read/);
      return final();
    }}} as unknown as Pick<OpenAI,"responses">;
    const result=await answerContent(current,{version:1,analysisId:current.id,messages:[]},"Explain this",{client,studioRoot:root});
    assert.ok(result.activity.some(item=>item.includes("project notes could not be read")));
    assert.equal(await fs.readFile(path.join(root,"workspace.json"),"utf8"),"damaged data to preserve");
  } finally {await fs.rm(root,{recursive:true,force:true});}
});
