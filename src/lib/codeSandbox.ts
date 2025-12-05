/**
 * Code Sandbox for MIRA
 * Securely executes JavaScript code in an isolated iframe
 */

export interface ExecutionResult {
    success: boolean;
    output: string[];
    error?: string;
    executionTime: number;
}

/**
 * Create a sandboxed iframe for code execution
 */
function createSandbox(): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox.add('allow-scripts');
    document.body.appendChild(iframe);
    return iframe;
}

/**
 * Execute JavaScript code in a sandboxed environment
 */
export async function executeJavaScript(code: string, timeout: number = 5000): Promise<ExecutionResult> {
    return new Promise((resolve) => {
        const startTime = performance.now();
        const output: string[] = [];
        let hasError = false;
        let errorMessage = '';

        // Create sandbox iframe
        const sandbox = createSandbox();

        // Set up timeout
        const timeoutId = setTimeout(() => {
            cleanup();
            resolve({
                success: false,
                output,
                error: 'Execution timed out (5 seconds limit)',
                executionTime: timeout,
            });
        }, timeout);

        // Cleanup function
        const cleanup = () => {
            clearTimeout(timeoutId);
            window.removeEventListener('message', messageHandler);
            if (sandbox.parentNode) {
                sandbox.parentNode.removeChild(sandbox);
            }
        };

        // Message handler for receiving results from sandbox
        const messageHandler = (event: MessageEvent) => {
            if (event.source !== sandbox.contentWindow) return;

            const { type, data } = event.data;

            switch (type) {
                case 'log':
                    output.push(data);
                    break;
                case 'error':
                    hasError = true;
                    errorMessage = data;
                    break;
                case 'done':
                    cleanup();
                    resolve({
                        success: !hasError,
                        output,
                        error: hasError ? errorMessage : undefined,
                        executionTime: performance.now() - startTime,
                    });
                    break;
            }
        };

        window.addEventListener('message', messageHandler);

        // Inject code into sandbox
        const sandboxCode = `
      <!DOCTYPE html>
      <html>
      <head>
        <script>
          // Override console methods to capture output
          const originalConsole = window.console;
          const output = [];
          
          window.console = {
            log: (...args) => {
              const message = args.map(arg => {
                try {
                  if (typeof arg === 'object') {
                    return JSON.stringify(arg, null, 2);
                  }
                  return String(arg);
                } catch (e) {
                  return String(arg);
                }
              }).join(' ');
              parent.postMessage({ type: 'log', data: message }, '*');
            },
            error: (...args) => {
              const message = args.map(arg => String(arg)).join(' ');
              parent.postMessage({ type: 'error', data: message }, '*');
            },
            warn: (...args) => {
              const message = '⚠️ ' + args.map(arg => String(arg)).join(' ');
              parent.postMessage({ type: 'log', data: message }, '*');
            },
            info: (...args) => {
              const message = 'ℹ️ ' + args.map(arg => String(arg)).join(' ');
              parent.postMessage({ type: 'log', data: message }, '*');
            },
            table: (data) => {
              try {
                parent.postMessage({ type: 'log', data: JSON.stringify(data, null, 2) }, '*');
              } catch (e) {
                parent.postMessage({ type: 'log', data: String(data) }, '*');
              }
            }
          };

          // Restrict dangerous APIs
          delete window.fetch;
          delete window.XMLHttpRequest;
          delete window.WebSocket;
          delete window.localStorage;
          delete window.sessionStorage;
          delete window.indexedDB;
          delete window.document.cookie;

          // Execute user code
          try {
            ${code}
            parent.postMessage({ type: 'done' }, '*');
          } catch (error) {
            parent.postMessage({ type: 'error', data: error.message || String(error) }, '*');
            parent.postMessage({ type: 'done' }, '*');
          }
        <\/script>
      </head>
      <body></body>
      </html>
    `;

        // Write to sandbox
        if (sandbox.contentDocument) {
            sandbox.contentDocument.open();
            sandbox.contentDocument.write(sandboxCode);
            sandbox.contentDocument.close();
        } else {
            cleanup();
            resolve({
                success: false,
                output: [],
                error: 'Failed to create sandbox environment',
                executionTime: 0,
            });
        }
    });
}

/**
 * Format execution output for display
 */
export function formatOutput(result: ExecutionResult): string {
    let formatted = '';

    if (result.output.length > 0) {
        formatted += result.output.join('\n');
    }

    if (result.error) {
        if (formatted) formatted += '\n';
        formatted += `❌ Error: ${result.error}`;
    }

    if (!formatted && result.success) {
        formatted = '✓ Executed successfully (no output)';
    }

    return formatted;
}

/**
 * Check if code is safe to execute (basic security check)
 */
export function isCodeSafe(code: string): { safe: boolean; reason?: string } {
    const dangerousPatterns = [
        { pattern: /eval\s*\(/g, reason: 'eval() is not allowed' },
        { pattern: /Function\s*\(/g, reason: 'Function constructor is not allowed' },
        { pattern: /document\.write/g, reason: 'document.write is not allowed' },
        { pattern: /window\.open/g, reason: 'window.open is not allowed' },
        { pattern: /location\s*=/g, reason: 'Modifying location is not allowed' },
        { pattern: /\.innerHTML\s*=/g, reason: 'innerHTML assignment is not allowed' },
    ];

    for (const { pattern, reason } of dangerousPatterns) {
        if (pattern.test(code)) {
            return { safe: false, reason };
        }
    }

    return { safe: true };
}
