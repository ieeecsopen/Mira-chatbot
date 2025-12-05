import { describe, it, expect } from 'vitest';
import { isCodeSafe } from '../lib/codeSandbox';

describe('codeSandbox', () => {
    describe('isCodeSafe', () => {
        it('should allow safe code', () => {
            const code = 'console.log("Hello World");';
            const result = isCodeSafe(code);
            expect(result.safe).toBe(true);
        });

        it('should allow functions and loops', () => {
            const code = `
        function fibonacci(n) {
          if (n <= 1) return n;
          return fibonacci(n - 1) + fibonacci(n - 2);
        }
        console.log(fibonacci(10));
      `;
            const result = isCodeSafe(code);
            expect(result.safe).toBe(true);
        });

        it('should block eval', () => {
            const code = 'eval("alert(1)")';
            const result = isCodeSafe(code);
            expect(result.safe).toBe(false);
            expect(result.reason).toContain('eval');
        });

        it('should block Function constructor', () => {
            const code = 'new Function("return 1")()';
            const result = isCodeSafe(code);
            expect(result.safe).toBe(false);
            expect(result.reason).toContain('Function constructor');
        });

        it('should block document.write', () => {
            const code = 'document.write("<h1>Injected</h1>")';
            const result = isCodeSafe(code);
            expect(result.safe).toBe(false);
            expect(result.reason).toContain('document.write');
        });

        it('should block innerHTML assignment', () => {
            const code = 'document.body.innerHTML = "<script>alert(1)</script>"';
            const result = isCodeSafe(code);
            expect(result.safe).toBe(false);
            expect(result.reason).toContain('innerHTML');
        });

        it('should block location modification', () => {
            const code = 'location = "https://malicious.com"';
            const result = isCodeSafe(code);
            expect(result.safe).toBe(false);
            expect(result.reason).toContain('location');
        });

        it('should block window.open', () => {
            const code = 'window.open("https://malicious.com")';
            const result = isCodeSafe(code);
            expect(result.safe).toBe(false);
            expect(result.reason).toContain('window.open');
        });
    });
});
