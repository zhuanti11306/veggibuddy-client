export const enum PathTestResult {
    None = 0, // 完全不匹配
    Partial = 1, // 部分匹配
    Exact = 2 // 精確匹配
}

export function parseRoute(raw: string): { path: string[], query: Record<string, string> } {
    const [pathPart, queryPart] = raw.split("?", 2);
    const path = pathPart.split("/").filter(Boolean);
    const query: Record<string, string> = Object.fromEntries(new URLSearchParams(queryPart ?? "").entries());
    return { path, query };
}

export function formatRoute(segments: string[], query?: Record<string, string>): string {
    const path = "/" + segments.join("/");

    if (query) {
        const queryString = new URLSearchParams(query).toString();
        if (queryString.length !== 0)
            return `${path}?${queryString}`;
    }
    
    return path;
}

export function getCurrentRoute(): { path: string[]; query: Record<string, string> } {
    return parseRoute(location.hash.slice(1));
}
export function resolve(...rawPaths: string[]): { path: string[]; query: Record<string, string> } {
    const resultPath: string[] = getCurrentRoute().path;
    const resultQuery: Record<string, string> = {};

    for (const rawPath of rawPaths) {
        const { path, query } = parseRoute(rawPath);

        if (rawPath.startsWith("/"))
            resultPath.length = 0; // 重設為根路徑

        // 處理相對路徑
        for (const segment of path) {
            switch (segment) {
                case ".":
                    break; // 當前目錄，無需操作
                case "..":
                    if (resultPath.length > 0) resultPath.pop(); // 上層目錄
                    else throw new Error("Cannot navigate above the root directory");
                    break;
                default:
                    resultPath.push(segment); // 其他路徑，直接加入
            }
        }

        // 合併查詢參數
        Object.assign(resultQuery, query);
    }

    return { path: resultPath, query: resultQuery };
}

export function goto(path: string | number): void {
    // 處理 history.go() 的情況
    if (typeof path === "number") {
        history.go(path);
        return;
    }

    // 解析路徑
    const resolved = resolve(path);
    
    // 更新 URL hash 來觸發導航
    location.hash = formatRoute(resolved.path, resolved.query);
}

export function testPath(path: string | string[], pattern: string | string[], exact: boolean = false): { result: PathTestResult; params: Record<string, string> } {
    const params: Record<string, string> = {};

    if (typeof path === "string")
        path = parseRoute(path).path;

    if (typeof pattern === "string")
        pattern = parseRoute(pattern).path;

    // 如果要求精確匹配，但長度不相等，則不匹配
    if (exact && pattern.length !== path.length) {
        return { result: PathTestResult.None, params: {} };
    }
    
    // 如果模式比當前路徑長，不可能匹配成功
    if (pattern.length > path.length) {
        return { result: PathTestResult.None, params: {} };
    }

    for (let i = 0; i < pattern.length; i++) {
        const patternSegment = pattern[i];
        const currentSegment = path[i];

        if (patternSegment === "*") {
            // "*" 匹配任意單一 non-empty 片段
            continue;
        }
        
        if (patternSegment.startsWith(":")) {
            // ":param" 捕獲參數
            if (currentSegment.length === 0) {
                 // 參數不能是空的
                return { result: PathTestResult.None, params: {} };
            }
            params[patternSegment.slice(1)] = currentSegment;
        } else if (patternSegment !== currentSegment) {
            // 靜態路徑不匹配
            return { result: PathTestResult.None, params: {} };
        }
    }

    // 迴圈結束後，比較長度以確定是精確匹配還是部分匹配
    const result = pattern.length === path.length ? PathTestResult.Exact : PathTestResult.Partial;
    return { result, params };
}

export function testCurrentPath(pattern: string | string[], exact: boolean = false): { result: PathTestResult; params: Record<string, string> } {
    return testPath(getCurrentRoute().path, pattern, exact);
}