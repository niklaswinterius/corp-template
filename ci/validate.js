import fs from "fs";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const read = (p) => JSON.parse(fs.readFileSync(p, "utf-8"));

const validateFile = (schemaPath, dataPath, name) => {
  const schema = read(schemaPath);
  const validate = ajv.compile(schema);
  const data = read(dataPath);
  const ok = validate(data);
  if (!ok) {
    console.error(`❌ ${name} invalid`);
    console.error(validate.errors);
    process.exitCode = 1;
  } else {
    console.log(`✅ ${name} valid`);
  }
};

validateFile("schemas/tokens.schema.json", "tokens/brand.tokens.json", "tokens");
validateFile("schemas/layouts.schema.json", "layouts/template_map.json", "layouts");

try {
  const exists = fs.existsSync("content/final.content.json");
  if (exists) {
    const schema = JSON.parse(fs.readFileSync("schemas/content.final.schema.json", "utf-8"));
    const validate = ajv.compile(schema);
    const data = JSON.parse(fs.readFileSync("content/final.content.json", "utf-8"));
    const ok = validate(data);
    if (!ok) {
      console.error("❌ content (final) invalid");
      console.error(validate.errors);
      process.exitCode = 1;
    } else {
      console.log("✅ content (final) valid");
    }
  } else {
    console.log("ℹ️ content/final.content.json not found (skip)");
  }
} catch (e) {
  console.error(e);
  process.exitCode = 1;
}

if (process.exitCode) process.exit(process.exitCode);
