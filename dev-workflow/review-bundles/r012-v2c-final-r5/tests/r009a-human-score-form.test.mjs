import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  HUMAN_SCORE_MODULES,
  renderChineseHumanScoreMarkdown,
  renderHumanScoreHtml,
} from "../scripts/benchmarks/r009a-human-score-form.mjs";

const REVIEW_CONTEXT_FIXTURE = {
  sources: Object.fromEntries(Array.from({ length: 20 }, (_, index) => {
    const number = index + 1;
    return [`source-${number}`, {
      source_id: `source-${number}`,
      image_src: `../../../../../.local-benchmark-sources/static-coffee-static-v1/sections/project-module-${String(number).padStart(2, "0")}.webp`,
      observation_zh: "观察画面中的品牌系统表现",
    }];
  })),
  candidate_summaries: Object.fromEntries(HUMAN_SCORE_MODULES.map((module) => [module.module_id, [`${module.label_zh}候选结论`]])),
};

test("中文 Markdown 保留全部八个稳定评分模块", () => {
  const markdown = renderChineseHumanScoreMarkdown();
  assert.equal(HUMAN_SCORE_MODULES.length, 8);
  assert.match(markdown, /R-009A 人工评分表/);
  assert.match(markdown, /1：严重不足/);
  assert.match(markdown, /5：优秀/);
  for (const module of HUMAN_SCORE_MODULES) {
    assert.match(markdown, new RegExp(module.module_id));
    assert.match(markdown, new RegExp(module.label_zh));
  }
});

test("可视化页面为每个模块提供 1–5 分选项且不预填 Owner 结论", () => {
  const html = renderHumanScoreHtml();
  for (const module of HUMAN_SCORE_MODULES) {
    assert.match(html, new RegExp(`name="score-${module.module_id}"`));
    for (const score of [1, 2, 3, 4, 5]) {
      assert.match(html, new RegExp(`name="score-${module.module_id}" value="${score}"`));
    }
  }
  assert.doesNotMatch(html, /type="radio"[^>]+checked/);
  assert.doesNotMatch(html, /name="reason-[^"]+"[^>]+>[^<]+<\/textarea>/);
});

test("可视化页面生成 Validator 兼容 JSON 并禁止隐式持久化", () => {
  const html = renderHumanScoreHtml();
  for (const field of [
    "status", "reviewer_name", "reviewer_role", "review_date", "corpus_id",
    "corpus_version", "source_pack_id", "candidate_run_id", "review_environment",
    "correction_proposals_reviewed", "scores", "artifact_refs", "evidence_refs",
  ]) assert.match(html, new RegExp(field));
  assert.match(html, /生成并复制 JSON/);
  assert.match(html, /navigator\.clipboard\.writeText/);
  assert.match(html, /完成度：<span id="completed-count">0<\/span> \/ 8/);
  assert.match(html, /请从下方预览区手动复制/);
  assert.doesNotMatch(html, /localStorage|sessionStorage|fetch\(|XMLHttpRequest|download=/);
});

test("可视化页面校验引用与 Owner 确认项", () => {
  const html = renderHumanScoreHtml();
  assert.match(html, /startsWith\("\/"\)/);
  assert.match(html, /includes\("\.\."\)/);
  assert.match(html, /\^ev-\[a-z0-9-\]\+\$/);
  assert.match(html, /source-pack-hash-verified/);
  assert.match(html, /correction-proposal-reviewed/);
  assert.match(html, /conflict-decision/);
});

test("Review Workspace generator 使用共享中文评分渲染器", () => {
  const source = readFileSync("scripts/benchmarks/generate-r009a-review-workspace.mjs", "utf8");
  assert.match(source, /renderChineseHumanScoreMarkdown/);
  assert.match(source, /renderHumanScoreHtml/);
  assert.match(source, /human-score-form\.html/);
});

test("每个评分模块都在同卡展示对应画面、候选结果和中文观察重点", () => {
  const html = renderHumanScoreHtml(REVIEW_CONTEXT_FIXTURE);
  for (const module of HUMAN_SCORE_MODULES) {
    assert.ok(Array.isArray(module.source_ids) && module.source_ids.length >= 4, `${module.module_id} 缺少画面映射`);
    assert.ok(Array.isArray(module.focus_zh) && module.focus_zh.length > 0, `${module.module_id} 缺少中文观察重点`);
    const start = html.indexOf(`data-module="${module.module_id}"`);
    const end = html.indexOf("</section>", start);
    const card = html.slice(start, end);
    assert.ok(start >= 0, `缺少评分模块 ${module.module_id}`);
    assert.match(card, /你正在评价什么/);
    assert.match(card, /对应画面/);
    assert.match(card, /候选提取结果/);
    assert.match(card, /如何评分/);
    assert.match(card, /<img /);
    assert.match(card, new RegExp(module.focus_zh[0]));
  }
});

test("技术引用留空仍可完成评分且所有操作字段使用中文", () => {
  const html = renderHumanScoreHtml(REVIEW_CONTEXT_FIXTURE);
  assert.match(html, /可选：技术引用/);
  assert.match(html, /产物引用（可选）/);
  assert.match(html, /证据引用（可选）/);
  assert.doesNotMatch(html, /请填写 Artifact refs|请填写 Evidence refs/);
  assert.doesNotMatch(html, />Review index<|>Source contact sheet<|>Artifact index<|>Side-by-side map</);
});
