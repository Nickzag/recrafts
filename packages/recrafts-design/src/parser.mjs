import { parse as parseYaml } from "yaml";
import { CANONICAL_SECTIONS } from "./schema.mjs";
import { assertDesignDocumentStructure } from "./schema_runtime.mjs";

function splitFrontMatter(source) {
  if (!source.startsWith("---\n")) throw new Error("design.md must begin with YAML Front Matter");
  const end = source.indexOf("\n---\n", 4);
  if (end < 0) throw new Error("design.md YAML Front Matter is not closed");
  let frontMatter;
  try { frontMatter = parseYaml(source.slice(4, end)); } catch (error) { throw new Error(`design.md YAML Front Matter is invalid: ${error.message}`); }
  return { frontMatter, markdown: source.slice(end + 5) };
}

function structuredBlock(body, marker) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(new RegExp("```yaml\\s+recrafts:" + escaped + "\\n([\\s\\S]*?)\\n```", "i"));
  if (!match) throw new Error(`Canonical section ${marker} requires a recrafts:${marker} YAML block`);
  try { return parseYaml(match[1]); } catch (error) { throw new Error(`Canonical section ${marker} YAML is invalid: ${error.message}`); }
}

export function parseDesignMd(source) {
  if (typeof source !== "string" || !source.trim()) throw new Error("design.md source must be non-empty text");
  const normalized = source.replaceAll("\r\n", "\n");
  const { frontMatter, markdown } = splitFrontMatter(normalized);
  if (!/^# Design System\s*$/m.test(markdown)) throw new Error("design.md canonical H1 must be # Design System");
  const matches = [...markdown.matchAll(/^## (.+)$/gm)];
  const actual = matches.map((match) => match[1].trim());
  const expected = CANONICAL_SECTIONS.map(([, heading]) => heading);
  if (actual.length !== expected.length || actual.some((heading, index) => heading !== expected[index])) throw new Error(`design.md canonical section headings must be exactly: ${expected.join(" | ")}; parallel authority headings are forbidden`);
  const sections = matches.map((match, index) => ({ key: CANONICAL_SECTIONS[index][0], heading: actual[index], body: markdown.slice(match.index + match[0].length, matches[index + 1]?.index ?? markdown.length).trim() }));
  const byKey = Object.fromEntries(sections.map((section) => [section.key, section]));
  const document = { frontMatter, sections, overview: byKey.overview.body, structured: { foundations: structuredBlock(byKey.foundations.body, "foundations"), compositions: structuredBlock(byKey.compositions.body, "compositions"), components: structuredBlock(byKey.components.body, "components"), states: structuredBlock(byKey.states.body, "states"), responsive: structuredBlock(byKey.responsive.body, "responsive"), agentRules: structuredBlock(byKey.agentRules.body, "agent-rules"), constraints: structuredBlock(byKey.constraints.body, "constraints") }, source: normalized };
  assertDesignDocumentStructure({ frontMatter: document.frontMatter, overview: document.overview, structured: document.structured });
  return document;
}
