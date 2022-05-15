/**
 * Autogenerate documentation for source files. This assumes a very specific format.
 *
 * run with
 * ```
 * npx esr scripts/build-docs.ts
 * ```
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Project, Node } from "ts-morph";

const README_COMMENT: string = `<!-- DO NOT MODIFY -->
<!-- This file was autogenerated by build-docs.ts -->
<!-- Edit the docstring in index.ts and regenerate -->
<!-- rather than editing this file directly. -->
`;

// We can only import ESM modules via async import, so all the action happens here.
(async function () {
    const chalk = await (await import("chalk")).default;
    const { unified } = await import("unified");
    const inject = await (await import("mdast-util-inject")).default;
    const b = await import("mdast-builder");
    const { getDataOnAllExports } = await import("./libs/get-symbols");
    const {
        gfmRemark,
        makeConstantsSection,
        makeFunctionsSection,
        makeTypesSection,
        makePluginsSection,
    } = await (
        await import("./libs/markdown-utils")
    ).default;
    type MdNode = ReturnType<typeof b.text>;

    ///////////////////////////////////////////////////////////
    // Build the documentation for all exports
    ///////////////////////////////////////////////////////////
    const project = new Project();
    project.addSourceFilesAtPaths("./packages/**/*.ts");

    // Find all the files we want to process. These have th form .../unified-latex.../index.ts,
    // however we only want the top-level index.ts files (no any that may be in subdirectories).

    const filesToProcess = project
        .getSourceFiles()
        .filter((file) =>
            file.getFilePath().match(/unified-latex[^/]*\/index\.ts/)
        );

    console.log(chalk.bold("Processing"), filesToProcess.length, "files");
    for (const file of filesToProcess) {
        console.log(
            "   ",
            chalk.magenta(file.getDirectory().getBaseName()),
            `/ ${file.getBaseName()}`
        );

        const outPath = path.join(file.getDirectoryPath(), "README.md");

        const readme = generateReadme(file.getFilePath());

        console.log(
            chalk.gray("       Writing to", path.relative(__dirname, outPath))
        );

        await fs.writeFile(outPath, readme, { encoding: "utf-8" });
    }

    /*
    const filename =
        //   "./packages/unified-latex/unified-latex-types/index.ts";
        "./packages/unified-latex/unified-latex-util-replace/index.ts";
    //"./packages/unified-latex/unified-latex-util-trim/index.ts";
    //"./packages/unified-latex/unified-latex-util-visit/index.ts";
    */

    function generateReadme(filename): string {
        const sourceFile = project.getSourceFileOrThrow(filename);

        const accumulatedExports = getDataOnAllExports(sourceFile);
        const constantsMd = makeConstantsSection(accumulatedExports.constants);
        const typesMd = makeTypesSection(accumulatedExports.types);
        const funcsMd = makeFunctionsSection(accumulatedExports.funcs);
        const pluginMd = makePluginsSection(accumulatedExports.plugins);

        // Grab the comments from index.ts
        const jsDoc = sourceFile.getLastToken().getFirstChild();
        let introText = "";
        if (Node.isJSDoc(jsDoc)) {
            introText = jsDoc.getCommentText();
        }

        const directoryName = sourceFile.getDirectory().getBaseName();
        let skeletonReadme = `# ${directoryName}`;
        if (introText) {
            skeletonReadme += "\n\n" + introText;
        }
        if (accumulatedExports.plugins.length > 0) {
            skeletonReadme += "\n\n# Plugins";
        }
        if (accumulatedExports.funcs.length > 0) {
            skeletonReadme += "\n\n# Functions";
        }
        if (accumulatedExports.constants.length > 0) {
            skeletonReadme += "\n\n# Constants";
        }
        if (accumulatedExports.types.length > 0) {
            skeletonReadme += "\n\n# Types";
        }

        // Assemble the dynamically-generated data
        const target = gfmRemark.parse(skeletonReadme);

        if (accumulatedExports.plugins.length > 0) {
            inject("Plugins", target, pluginMd);
        }
        if (accumulatedExports.funcs.length > 0) {
            inject("Functions", target, funcsMd);
        }
        if (accumulatedExports.constants.length > 0) {
            inject("Constants", target, constantsMd);
        }
        if (accumulatedExports.types.length > 0) {
            inject("Types", target, typesMd);
        }

        const renderedReadme = `${README_COMMENT}${gfmRemark.stringify(
            target
        )}`;

        return renderedReadme;
    }
})();
