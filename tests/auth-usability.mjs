import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

try {
  await page.setContent(`
    <main class="container">
      <section id="authCard" class="card auth-card">
        <div class="field"><label for="email">Email</label><input id="email" type="email"></div>
        <div class="field"><label for="password">Password</label><input id="password" type="password"></div>
        <button id="signIn" type="button">Sign In</button>
        <button id="forgot" type="button">Forgot Password</button>
        <p id="message" class="hidden"></p>
      </section>
      <section id="dashboard" class="hidden"></section>
    </main>
  `);
  await page.addStyleTag({ path: path.join(root, "assets/styles.css") });
  await page.evaluate(() => {
    window.MANGO_FITNESS_SUPABASE = { url: "https://example.invalid", anonKey: "test" };
    window.__signInCalls = 0;
    window.supabase = {
      createClient: () => ({
        auth: {
          getSession: async () => ({ data: { session: null } }),
          signInWithPassword: async () => {
            window.__signInCalls += 1;
            await new Promise((resolve) => setTimeout(resolve, 40));
            return { data: {}, error: { message: "Expected test error" } };
          },
          signOut: async () => {}
        }
      })
    };
  });
  await page.addScriptTag({ path: path.join(root, "assets/auth.js") });
  await page.evaluate(() => initLoginPage({
    emailId: "email",
    passwordId: "password",
    signInBtnId: "signIn",
    forgotBtnId: "forgot",
    authCardId: "authCard",
    dashboardId: "dashboard",
    messageId: "message"
  }));

  assert.equal(await page.locator("#email").getAttribute("autocomplete"), "username");
  assert.equal(await page.locator("#email").getAttribute("inputmode"), "email");
  assert.equal(await page.locator("#email").getAttribute("autocapitalize"), "none");
  assert.equal(await page.locator("#email").getAttribute("spellcheck"), "false");
  assert.equal(await page.locator("#password").getAttribute("autocomplete"), "current-password");

  const toggle = page.locator(".password-visibility-toggle");
  const toggleBox = await toggle.boundingBox();
  assert.ok(toggleBox && toggleBox.height >= 44 && toggleBox.width >= 44);
  await toggle.click();
  assert.equal(await page.locator("#password").getAttribute("type"), "text");
  assert.equal(await toggle.getAttribute("aria-label"), "Hide password");

  await page.locator("#email").fill("athlete@example.com");
  await page.locator("#password").fill("password123");
  await page.locator("#password").press("Enter");
  await page.locator("#password").press("Enter");
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(() => window.__signInCalls), 1);

  await page.locator("#forgot").click();
  const resetEmail = page.locator("#forgotResetEmail");
  assert.equal(await resetEmail.getAttribute("autocomplete"), "email");
  assert.equal(await resetEmail.getAttribute("inputmode"), "email");
  assert.equal(await resetEmail.getAttribute("autocapitalize"), "none");
  assert.equal(await resetEmail.getAttribute("spellcheck"), "false");

  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  assert.equal(await page.locator("#connectionStatusBanner").innerText(), "You’re offline. Sign-in and sync need internet.");
  assert.equal(await page.locator("#connectionStatusBanner").isVisible(), true);
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  assert.equal(await page.locator("#connectionStatusBanner").isVisible(), false);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));

  console.log("auth usability checks passed");
} finally {
  await browser.close();
}
