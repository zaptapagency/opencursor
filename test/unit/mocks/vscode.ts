// Minimal `vscode` module mock for Vitest unit tests. Only the surfaces the
// unit-tested host code touches are implemented; expand as later phases add
// coverage.

export const Uri = {
  joinPath: (base: { fsPath: string }, ...parts: string[]) => ({
    fsPath: [base.fsPath, ...parts].join('/'),
    toString: () => [base.fsPath, ...parts].join('/'),
  }),
  file: (p: string) => ({ fsPath: p, toString: () => p }),
};

export const window = {
  showInformationMessage: (msg: string) => Promise.resolve(msg),
  registerWebviewViewProvider: () => ({ dispose() {} }),
};

export const commands = {
  registerCommand: () => ({ dispose() {} }),
};
