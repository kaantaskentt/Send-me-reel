import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type OpenAI from "openai";
import { answerContent } from "../src/lib/local-conversation";
import { parseContentInspection } from "../src/lib/content-conversation";
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

test("a real inspection result is attached to the answer and survives into follow-up evidence", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-chat-inspection-"));
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "fixture-not-a-live-key";
  try {
    const current = source("video", { source_url: "https://www.youtube.com/watch?v=QhmhUgccaS0", metadata: { duration: 120 }, frame_descriptions: [{ timestampSec: 0, description: "Overview" }] });
    let round = 0;
    let inspections = 0;
    const client = { responses: { create: async () => round++ === 0 ? response([call("moment", "inspect_moment", { startSec: 40, endSec: 45, question: "Read the repo name" })]) : final({ evidence: [99] }) } } as unknown as Pick<OpenAI, "responses">;
    const result = await answerContent(current, { version: 1, analysisId: current.id, messages: [] }, "What repo is shown?", {
      client, studioRoot: root, workspace: {}, inspectMoment: async options => {
        inspections++;
        assert.equal(options.sourceUrl, current.source_url);
        return { status: "complete", sourceUrl: current.source_url, provider: "gemini", model: "gemini-test", range: { startSec: 40, endSec: 45 }, mode: "static", fps: 2, resolution: "high",
          evidence: { summary: "The repo name is visible.", observations: [{ timestampSec: 42, description: "A repository header", onScreenText: ["example/visible-repo"], urls: [], tools: ["GitHub"], speech: "The presenter describes the repository.", uncertain: false }], limitations: [] },
          usage: { promptTokenCount: 10, candidatesTokenCount: 10, thoughtsTokenCount: 0, cachedContentTokenCount: 0, totalTokenCount: 20 }, coverage: "Only this clip was sampled at 2 FPS." };
      },
    });
    assert.equal(inspections, 1);
    assert.deepEqual(result.reply.evidence, []);
    assert.equal(result.reply.inspections?.[0].startSec, 40);
    assert.equal(result.reply.inspections?.[0].observations[0].onScreenText[0], "example/visible-repo");
    const conversation = JSON.parse(JSON.stringify({ version: 1, analysisId: current.id, messages: [{ id: "reply", role: "assistant", text: result.reply.answer, reply: result.reply, createdAt: new Date().toISOString() }] }));
    const followup = { responses: { create: async (request: { input: unknown }) => {
      assert.match(JSON.stringify(request.input), /SAVED CLIP INSPECTIONS/);
      assert.match(JSON.stringify(request.input), /example\/visible-repo/);
      return final();
    } } } as unknown as Pick<OpenAI, "responses">;
    await answerContent(current, conversation, "What did the header say?", { client: followup, studioRoot: root, workspace: {}, inspectMoment: async () => { assert.fail("The existing inspection is already available"); } });
    assert.equal(inspections, 1);
  } finally {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousKey;
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("saved inspection evidence rejects foreign sources, invalid ranges and invented timestamps", () => {
  const valid = { id: "a".repeat(64), sourceUrl: "https://example.com/video", question: "Read this", startSec: 10, endSec: 20, summary: "A reference", coverage: "Sampled", observations: [{ timestampSec: 12, description: "A header", onScreenText: [], speech: "", uncertain: true }] };
  assert.ok(parseContentInspection(valid, valid.sourceUrl));
  assert.equal(parseContentInspection(valid, "https://example.com/other"), null);
  assert.equal(parseContentInspection({ ...valid, endSec: 60 }, valid.sourceUrl), null);
  assert.equal(parseContentInspection({ ...valid, observations: [{ ...valid.observations[0], timestampSec: 80 }] }, valid.sourceUrl), null);
  assert.equal(parseContentInspection({ ...valid, observations: [] }, valid.sourceUrl), null);
});

test("the reply model cannot fabricate an inspection that no tool performed", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-chat-fake-inspection-"));
  try {
    const current = source("current");
    const client = { responses: { create: async () => final({ inspections: [{ sourceUrl: current.source_url, summary: "Pretend inspection" }] }) } } as unknown as Pick<OpenAI, "responses">;
    const result = await answerContent(current, { version: 1, analysisId: current.id, messages: [] }, "What does it show?", { client, studioRoot: root, workspace: {} });
    assert.equal(result.reply.inspections, undefined);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("a broad question returns collected evidence when its lookup budget is exhausted", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-chat-budget-"));
  try {
    const current = source("many-repos", { caption: "Visible repos include example/one. The full list is not shown." });
    let turns = 0;
    const client = { responses: { create: async (request: { tool_choice: string; instructions: string; input: Array<{ type?: string; output?: string }> }) => {
      if (turns++ === 0) return response(Array.from({ length: 10 }, (_, i) => call(`lookup-${i}`, "search_source", { query: "example/one" })));
      assert.equal(request.tool_choice, "none");
      assert.match(request.instructions, /what remains unresolved/);
      const results = request.input.filter(item => item.type === "function_call_output").map(item => JSON.parse(item.output!));
      assert.equal(results.length, 10, "Every requested call receives a result, including unperformed lookups");
      assert.equal(results.filter(item => item.error).length, 2);
      return final({ answer: "I found example/one in the captured text, but could not verify all 40 repos." });
    } } } as unknown as Pick<OpenAI, "responses">;
    const result = await answerContent(current, { version: 1, analysisId: current.id, messages: [] }, "Find the full list", { client, studioRoot: root, workspace: {} });
    assert.match(result.reply.answer, /could not verify all 40/);
    assert.equal(result.usage.calls, 2);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("repeated research reserves a final answer turn instead of discarding useful findings", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-chat-rounds-"));
  try {
    const current = source("many-repos", { caption: "One visible repo." });
    let turns = 0;
    const client = { responses: { create: async (request: { tool_choice: string }) => {
      if (turns++ < 5) return response([call(`lookup-${turns}`, "search_source", { query: "repo" })]);
      assert.equal(request.tool_choice, "none");
      return final({ answer: "I can read one repo. The remaining names are unverified." });
    } } } as unknown as Pick<OpenAI, "responses">;
    const result = await answerContent(current, { version: 1, analysisId: current.id, messages: [] }, "Find the full list", { client, studioRoot: root, workspace: {} });
    assert.equal(result.usage.calls, 6);
    assert.match(result.reply.answer, /unverified/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

for (const format of ["markdown", "inline code", "plain text", "www host"]) test(`a ${format} repo link receives an identity check and cannot silently become the source's exact owner`, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-chat-repo-check-"));
  try {
    const current = source("repos", { caption: "The video names ui-ux-pro-max but its owner is unreadable." });
    const url = "https://github.com/example/ui-ux-pro-max";
    const answer = format === "markdown" ? `The owner is [example](${url}).`
      : format === "inline code" ? `The owner is \`${url}\`.`
      : format === "www host" ? `The owner is ${url.replace("github.com", "www.github.com")}.`
      : `The owner is ${url}.`;
    let turns = 0, checks = 0;
    const client = { responses: { create: async (request: { tool_choice: string; input: unknown }) => {
      if (turns++ === 0) return response([{ type: "web_search_call", action: { type: "search", sources: [{ url }] } }], final({ answer }).output_text);
      assert.equal(request.tool_choice, "none");
      assert.match(JSON.stringify(request.input), /candidate/);
      // Even a stubborn model must not lose the source-match qualification.
      return final({ answer });
    } } } as unknown as Pick<OpenAI, "responses">;
    const result = await answerContent(current, { version: 1, analysisId: current.id, messages: [] }, "Find the owner", {
      client, studioRoot: root, workspace: {}, verifyRepository: async (proposed, clues) => {
        checks++; assert.equal(proposed, url);
        assert.ok(!JSON.stringify(clues).includes("example/ui-ux-pro-max"), "Search results are never promoted into original source clues");
        return { existence: "verified", sourceMatch: "candidate", repository: { url, fullName: "example/ui-ux-pro-max", owner: "example", name: "ui-ux-pro-max", description: null, archived: false, defaultBranch: "main", license: null }, matchedClues: [], reason: "The name alone cannot establish its owner.", checkedAt: new Date().toISOString() };
      },
    });
    assert.equal(checks, 1);
    assert.match(result.reply.answer, /possible matches[\s\S]*not confirmed/);
    assert.ok(result.activity.includes("Checked suggested repositories against source clues"));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
