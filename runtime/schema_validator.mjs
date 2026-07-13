import { readFileSync } from "node:fs";

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const typeMatches = (value, type) => {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  return typeof value === type;
};

export function validateSchema(value, schema, location = "$") {
  const errors = [];
  const types = schema.type ? (Array.isArray(schema.type) ? schema.type : [schema.type]) : [];
  if (types.length && !types.some((type) => typeMatches(value, type))) return [`${location}: expected ${types.join("|")}`];
  if (Object.hasOwn(schema, "const") && !same(value, schema.const)) errors.push(`${location}: must equal declared const`);
  if (schema.enum && !schema.enum.some((item) => same(value, item))) errors.push(`${location}: value is not in enum`);
  if (typeof value === "string" && schema.minLength && value.length < schema.minLength) errors.push(`${location}: string is too short`);
  if (Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) errors.push(`${location}: array is too short`);
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) errors.push(`${location}: array items must be unique`);
    if (schema.items) value.forEach((item, index) => errors.push(...validateSchema(item, schema.items, `${location}[${index}]`)));
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const required of schema.required ?? []) if (!Object.hasOwn(value, required)) errors.push(`${location}.${required}: required`);
    const properties = schema.properties ?? {};
    for (const [key, child] of Object.entries(value)) {
      if (properties[key]) errors.push(...validateSchema(child, properties[key], `${location}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`${location}.${key}: unknown field`);
    }
  }
  return errors;
}

export function assertSchema(value, schema, label = "payload") {
  const errors = validateSchema(value, schema);
  if (errors.length) throw Object.assign(new Error(`${label} Schema validation failed: ${errors.join("; ")}`), { code: "SCHEMA_VALIDATION_FAILED" });
}

export function loadSchema(url) {
  return JSON.parse(readFileSync(url, "utf8"));
}
