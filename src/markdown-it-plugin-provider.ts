import type { KatexOptions } from "katex";
import type MarkdownIt from "markdown-it"
import { configManager } from "./configuration/manager";

const katexOptions: KatexOptions = { throwOnError: false };

/**
 * https://code.visualstudio.com/api/extension-guides/markdown-extension#adding-support-for-new-syntax-with-markdownit-plugins
 */
export function extendMarkdownIt(md: MarkdownIt): MarkdownIt {
    extendsMd(md)

    return md;
}

async function extendsMd(md: MarkdownIt) {
    md.use((await import("markdown-it-task-lists")).default);

    if (configManager.get("math.enabled")) {
        // We need side effects. (#521)
        // @ts-ignore
        await import("katex/contrib/mhchem");

        // Deep copy, as KaTeX needs a normal mutable object. <https://katex.org/docs/options.html>
        const macros: KatexOptions["macros"] = JSON.parse(JSON.stringify(configManager.get("katex.macros")));

        if (Object.keys(macros).length === 0) {
            delete katexOptions["macros"];
        } else {
            katexOptions["macros"] = macros;
        }

        md.use((await import("@neilsustc/markdown-it-katex")).default, katexOptions);
    }
}
