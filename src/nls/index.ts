"use strict";

import * as vscode from "vscode";
import VisualStudioCodeLocaleId from "../contract/VisualStudioCodeLocaleId";

export type Primitive = string | number | bigint | boolean | symbol | undefined | null;

export interface IConfigOption {
    extensionContext: vscode.ExtensionContext;
    locale?: VisualStudioCodeLocaleId;
}

export interface IFuncLocalize {

    /**
     * @param key The key of the format string of the message in the bundle.
     * @param args An array of objects to format.
     */
    (key: string, ...args: Primitive[]): string;
}

interface IInternalOption {

    /**
     * Indicates whether the extension is **not** running in development mode.
     * The same as `ExtensionContext.extensionMode !== Development`.
     */
    cacheResolution: boolean;

    /**
     * The same as `ExtensionContext.extensionPath`.
     */
    extensionPath: string;

    /**
     * The default locale.
     * This is internally treated as an arbitrary string.
     */
    locale: VisualStudioCodeLocaleId | undefined;
}

interface INlsBundle {
    [key: string]: string;
}

// https://github.com/microsoft/vscode-nls/blob/9fd18e6777276ebeb68ddf314ec2459abc6e3f4f/src/node/main.ts#L36-L46
// https://github.com/microsoft/vscode/blob/dad5d39eb0a251a726388f547e8dc85cd96a184d/src/vs/base/node/languagePacks.d.ts
interface IVscodeNlsConfig {
    locale: string;
    availableLanguages: {
        [pack: string]: string;
    };
}

//#region Utility

import zhCn from '../../package.nls.zh-cn.json';
import en from '../../package.nls.json';
import ja from '../../package.nls.ja.json';

function getLocalize<T = any>(path: VisualStudioCodeLocaleId): T {
    const localizationMap: Partial<Record<VisualStudioCodeLocaleId,any>> = {
        'zh-cn': zhCn,
        en,
        ja
    }

    return localizationMap[path] || {}
}

//#endregion Utility

//#region Private

// Why `Object.create(null)`:
// Once constructed, this is used as a readonly dictionary (map).
// It is performance-sensitive, and should not be affected by the outside.
// Besides, `Object.prototype` might collide with our keys.
const resolvedBundle: INlsBundle = Object.create(null);

/**
 * Internal options.
 * Will be initialized in `config()`.
 */
const options: IInternalOption = Object.create(null);

/**
 * Updates the in-memory NLS bundle.
 * @param locales An array of locale IDs. The default locale will be appended.
 */
function cacheBundle(locales: VisualStudioCodeLocaleId[] = []): void {
    if (options.locale) {
        locales.push(options.locale); // Fallback.
    }

    for (const local of locales) {
        Object.assign<typeof resolvedBundle, typeof resolvedBundle>(resolvedBundle, getLocalize<INlsBundle>(local));
    }
}

/**
 * @param message A composite format string.
 * @param args An array of objects to format.
 */
function format(message: string, ...args: Primitive[]): string {
    if (args.length === 0) {
        return message;
    } else {
        return message.replace(/\{(0|[1-9]\d*?)\}/g, (match: string, index: string): string => {
            // `index` is zero-based.
            return args.length > +index ? String(args[+index]) : match;
        });
    }
}

//#endregion Private

//#region Public

export const localize: IFuncLocalize = function (key: string, ...args: Primitive[]): string {
    if (options.cacheResolution) {
        const msg: string | undefined = resolvedBundle[key];
        return msg === undefined ? "[" + key + "]" : format(msg, ...args);
    } else {
        // When in development mode, hot reload, and reveal the key.
        cacheBundle();
        const msg: string | undefined = resolvedBundle[key];
        return msg === undefined ? "[" + key + "]" : "[" + key.substring(key.lastIndexOf(".") + 1) + "] " + format(msg, ...args);
    }
};

/**
 * Configures the NLS module.
 *
 * You should only call it **once** in the application entry point.
 */
export function config(opts: IConfigOption) {
    options.locale = opts.locale || VisualStudioCodeLocaleId.English

    options.extensionPath = opts.extensionContext.extensionPath;
    options.cacheResolution = opts.extensionContext.extensionMode !== vscode.ExtensionMode.Development;

    // Load and freeze the cache when not in development mode.
    if (options.cacheResolution) {
        cacheBundle();
        Object.freeze(resolvedBundle);
    }

    return localize;
}

//#endregion Public
