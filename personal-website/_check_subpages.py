import asyncio
from playwright.async_api import async_playwright

URLS = [
    "http://127.0.0.1:8090/hobby.html?h=sport",
    "http://127.0.0.1:8090/pet-daily.html",
]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        for url in URLS:
            page = await browser.new_page(viewport={"width": 1280, "height": 800})
            errors = []
            page.on("console", lambda m: errors.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
            page.on("pageerror", lambda e: errors.append(f"[pageerror] {e}"))
            await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            await page.wait_for_timeout(2500)
            info = await page.evaluate("""() => {
                const box = document.getElementById('musicBox');
                if (!box) return { exists: false };
                const r = box.getBoundingClientRect();
                const cs = getComputedStyle(box);
                const title = document.getElementById('musicTitle')?.textContent;
                const btn = document.getElementById('musicToggle')?.textContent;
                const prev = !!document.getElementById('musicPrev');
                const next = !!document.getElementById('musicNext');
                return {
                    exists: true,
                    rect: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)},
                    display: cs.display,
                    visibility: cs.visibility,
                    opacity: cs.opacity,
                    position: cs.position,
                    audioSrc: document.getElementById('bgMusic')?.getAttribute('src'),
                    title, btn, prev, next
                };
            }""")
            print("="*60)
            print("URL:", url)
            print("INFO:", info)
            print("CONSOLE:", errors if errors else "none")
            # screenshot
            name = url.split("/")[-1].split("?")[0] + "_check.png"
            await page.screenshot(path=name, full_page=False)
            print("SHOT:", name)
            await page.close()
        await browser.close()

asyncio.run(main())
