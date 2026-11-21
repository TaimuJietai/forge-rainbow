import { webview } from '@kit.ArkWeb';

/** 对齐 jssdk 回包 data */
interface BridgeResultData {
  platform?: string;
  ts?: number;
  action?: string;
}

/** 对齐 webViewHost.__callback 的 result */
interface BridgeResult {
  msg: string;
  code: number;
  data: BridgeResultData;
}

interface BridgeEnvelope {
  action?: string;
  callbackKey?: string;
}

/**
 * 对齐 jssdk/src/api-names.js（及 Invoke 内置 ready/config）。
 * H5 → kWHScriptHandlerName.postMessage(encodeURIComponent(JSON))
 * Native → webViewHost.__callback(callbackKey, result)
 */
export class WebViewHostBridge {
  private controller: webview.WebviewController | null = null;
  private readonly platform: string = 'harmony';

  bindController(controller: webview.WebviewController): void {
    this.controller = controller;
  }

  postMessage(encoded: string): void {
    if (!encoded || encoded.length === 0) {
      return;
    }
    try {
      const raw: string = decodeURIComponent(encoded);
      const envelope: BridgeEnvelope = JSON.parse(raw) as BridgeEnvelope;
      const action: string = envelope.action !== undefined ? String(envelope.action) : '';
      const callbackKey: string =
        envelope.callbackKey !== undefined ? String(envelope.callbackKey) : '';
      if (callbackKey.length === 0) {
        return;
      }
      const result: BridgeResult = this.handleAction(action);
      this.reply(callbackKey, result);
    } catch (_e) {
      // ignore malformed envelope
    }
  }

  private handleAction(action: string): BridgeResult {
    if (action === 'ready' || action === 'ping' || action === 'config') {
      const data: BridgeResultData = {
        platform: this.platform,
      };
      if (action === 'ping') {
        data.ts = Date.now();
      }
      const ok: BridgeResult = {
        msg: `${action}::ok`,
        code: 0,
        data: data,
      };
      return ok;
    }
    const unknownData: BridgeResultData = {
      action: action,
    };
    const fail: BridgeResult = {
      msg: `Unknown action: ${action}`,
      code: 40401,
      data: unknownData,
    };
    return fail;
  }

  private reply(callbackKey: string, result: BridgeResult): void {
    if (this.controller === null) {
      return;
    }
    const keyLit: string = JSON.stringify(callbackKey);
    const body: string = JSON.stringify(result);
    const script: string = `window.webViewHost&&webViewHost.__callback(${keyLit},${body});`;
    try {
      this.controller.runJavaScript(script);
    } catch (_e) {
      // ignore
    }
  }
}
