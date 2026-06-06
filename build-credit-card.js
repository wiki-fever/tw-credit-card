const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const pluginRoot = __dirname;
const srcDir = path.join(pluginRoot, "src");
const outDir = path.join(pluginRoot, "files");
const manifestPath = path.join(pluginRoot, "tiddlywiki.files");
const pluginInfoPath = path.join(pluginRoot, "plugin.info");

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function readPluginInfo() {
  return JSON.parse(fs.readFileSync(pluginInfoPath, "utf8"));
}

function getGeneratedEmptyFiles() {
  const manifest = readManifest();
  const files = new Set();

  for (const tiddler of manifest.tiddlers || []) {
    if (tiddler.generate === "empty" && tiddler.file) {
      files.add(tiddler.file);
    }
  }

  return files;
}

function manifestFileToOutputPath(fileName) {
  return path.join(pluginRoot, fileName);
}

function listSourceEntries() {
  return fs
    .readdirSync(srcDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

function stripEsModuleMarker(code) {
  return code.replace(
    /^Object\.defineProperty\(exports, "__esModule".*\);\s*\n?/m,
    ""
  );
}

function indentBlock(code) {
  return code
    .split("\n")
    .map((line) => (line.length ? `    ${line}` : line))
    .join("\n");
}

async function buildFile(fileName) {
  const filePath = path.join(srcDir, fileName);
  const source = fs.readFileSync(filePath, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES5,
      module: ts.ModuleKind.CommonJS,
      removeComments: true
    }
  });

  const body = indentBlock(stripEsModuleMarker(result.outputText.trimEnd()));
  const wrapped = `!(function () {\n${body}\n})();\n`;
  const outFile = path.join(outDir, fileName.replace(/\.ts$/, ".js"));
  fs.writeFileSync(outFile, wrapped, "utf8");
}

function filesAreDifferent(sourcePath, targetPath) {
  if (!fs.existsSync(targetPath)) {
    return true;
  }

  const source = fs.readFileSync(sourcePath);
  const target = fs.readFileSync(targetPath);
  return !source.equals(target);
}

function copyAsset(fileName) {
  const sourcePath = path.join(srcDir, fileName);
  const targetPath = path.join(outDir, fileName);
  if (filesAreDifferent(sourcePath, targetPath)) {
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function buildPluginText() {
  const manifest = readManifest();
  const tiddlers = {};

  for (const tiddler of manifest.tiddlers || []) {
    if (!tiddler.file || !tiddler.fields || !tiddler.fields.title) {
      continue;
    }

    const filePath = manifestFileToOutputPath(tiddler.file);
    const fileContent = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, "utf8")
      : "";

    tiddlers[tiddler.fields.title] = {
      ...tiddler.fields,
      text: `${tiddler.prefix || ""}${fileContent}${tiddler.suffix || ""}`
    };
  }

  return JSON.stringify({ tiddlers }, null, 2);
}

function toTidFieldBlock(fields) {
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([name, value]) => `${name}: ${String(value).replace(/\r?\n/g, " ")}`)
    .join("\n");
}

async function buildAll() {
  fs.mkdirSync(outDir, { recursive: true });
  const entries = listSourceEntries();
  const allowedOutputs = new Set();
  const generatedEmptyFiles = getGeneratedEmptyFiles();

  for (const fileName of generatedEmptyFiles) {
    allowedOutputs.add(path.basename(fileName));
    const outPath = manifestFileToOutputPath(fileName);
    if (!fs.existsSync(outPath) || fs.readFileSync(outPath, "utf8") !== "") {
      fs.writeFileSync(outPath, "", "utf8");
    }
  }

  for (const fileName of entries) {
    if (fileName.endsWith(".d.ts")) {
      continue;
    }

    if (fileName.endsWith(".ts")) {
      const outName = fileName.replace(/\.ts$/, ".js");
      allowedOutputs.add(outName);
      await buildFile(fileName);
      continue;
    }

    allowedOutputs.add(fileName);
    copyAsset(fileName);
  }

  for (const item of fs.readdirSync(outDir, { withFileTypes: true })) {
    if (!item.isFile()) {
      continue;
    }

    if (!allowedOutputs.has(item.name)) {
      fs.unlinkSync(path.join(outDir, item.name));
    }
  }
}

async function packageTid() {
  console.log("Packaging plugin into a .tid file...");

  const pkg = require("./package.json");
  const sourcePluginInfo = readPluginInfo();
  const pluginTitle = sourcePluginInfo.title || "$:/plugins/wiki-fever/credit-card";
  const pluginName = pluginTitle.split("/").pop() || pkg.name || "credit-card";
  const outputBaseName = pluginName.replace(/[^a-z0-9._-]/gi, "-");
  const pkgVersion = pkg.version || sourcePluginInfo.version || "0.0.1";
  const outputFilePath = path.join(pluginRoot, `${outputBaseName}.tid`);
  const legacyVersionedPath = path.join(pluginRoot, `${outputBaseName}-${pkgVersion}.tid`);
  const pluginText = buildPluginText();
  const outputFields = {
    title: pluginTitle,
    type: "application/json",
    ...sourcePluginInfo,
    version: pkgVersion,
    description: sourcePluginInfo.description || pkg.description || ""
  };

  fs.rmSync(outputFilePath, { force: true });
  fs.rmSync(legacyVersionedPath, { force: true });

  fs.writeFileSync(
    outputFilePath,
    `${toTidFieldBlock(outputFields)}\n\n${pluginText}\n`,
    "utf8"
  );

  if (!fs.existsSync(outputFilePath)) {
    throw new Error(`Expected packaged file was not created: ${outputFilePath}`);
  }

  console.log(`✅ Plugin packaged successfully: ${outputFilePath}`);
}

async function run() {
  const watch = process.argv.includes("--watch");

  await buildAll();
  console.log("Build finished.");

  if (watch) {
    let timer = null;
    const scheduleRebuild = () => {
      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(() => {
        buildAll().catch((error) => {
          console.error(error);
          process.exitCode = 1;
        });
      }, 50);
    };

    fs.watch(srcDir, scheduleRebuild);
    fs.watch(manifestPath, scheduleRebuild);

    console.log("Watching credit-card src/*...");
  } else {
    await packageTid();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
