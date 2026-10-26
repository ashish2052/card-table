# Full-round Playwright test: 3 browser tabs play a rigged round to a declared winner. Start the server first:
#   MARRIAGE_TEST=1 PORT=8850 node server.js
import os, sys, time
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE", "http://localhost:8850")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "shots")
os.makedirs(SHOTS, exist_ok=True)
PHONE = {"width": 844, "height": 390}
errors = []

def shot(page, name):
    page.screenshot(path=os.path.join(SHOTS, name))
    print("shot", name)

def wire(page, who):
    page.on("console", lambda m: errors.append(f"{who}: {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"{who} pageerror: {e}"))

def my_turn(page, step=None, timeout=15000):
    page.wait_for_function("document.querySelector('#banner').classList.contains('me')", timeout=timeout)
    if step == "discard":
        page.wait_for_function("document.querySelector('#banner').textContent.includes('throw')", timeout=timeout)
    time.sleep(0.9)  # let the springs land

def centre(page, sel):
    b = page.locator(sel).first.bounding_box()
    return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2

def drag_last_card_to_pile(page):
    cards = page.locator(".card.mine")
    n = cards.count()
    last = cards.nth(n - 1).bounding_box()
    sx, sy = last["x"] + last["width"] / 2, last["y"] + last["height"] / 2
    tx, ty = centre(page, "#discSlot")
    page.mouse.move(sx, sy); page.mouse.down()
    for i in range(1, 13):
        page.mouse.move(sx + (tx - sx) * i / 12, sy + (ty - sy) * i / 12); time.sleep(0.02)
    return tx, ty

with sync_playwright() as p:
    br = p.chromium.launch(channel="msedge", headless=True, args=[])
    ctxs = [br.new_context(viewport=PHONE, device_scale_factor=2) for _ in range(3)]
    for c in ctxs: c.add_init_script("localStorage.setItem('marriage.mute','1')")  # headless Chrome dies on AudioContext
    pages = [c.new_page() for c in ctxs]
    names = ["Ashish", "Sita", "Ram"]
    for pg, nm in zip(pages, names): wire(pg, nm)
    host, sita, ram = pages

    host.goto(BASE); host.wait_for_selector("#create")
    time.sleep(1.2); shot(host, "01-lobby-phone.png")
    host.fill("#name", "Ashish"); host.click("#create")
    host.wait_for_selector("#room:not([hidden])")
    code = host.inner_text("#roomcode"); print("room", code)
    for pg, nm in ((sita, "Sita"), (ram, "Ram")):
        pg.goto(f"{BASE}/?r={code}"); pg.fill("#name", nm); pg.click("#join")
        pg.wait_for_selector("#room:not([hidden])")
    host.wait_for_function("document.querySelectorAll('#plist li').length === 3")
    time.sleep(0.6); shot(host, "02-room-phone.png")

    host.click("#start")
    for pg in pages: pg.wait_for_selector("#game:not([hidden])")
    time.sleep(0.8); shot(host, "03a-dealing-phone.png")
    time.sleep(3.2); shot(host, "03-table-phone.png")
    assert host.locator(".card.mine").count() == 21, "host should hold 21 cards"

    # Sita (seat 1) plays first: draw from stock, drag a card onto the pile
    my_turn(sita)
    sita.click("#stockSlot"); my_turn(sita, "discard")
    shot(sita, "04-sita-hand-phone.png")
    tx, ty = drag_last_card_to_pile(sita)
    shot(sita, "05-dragging-phone.png")
    sita.mouse.up()
    host.wait_for_function("document.querySelector('#banner').textContent.includes('Ram')")
    print("sita discarded via drag")

    # Ram (seat 2): draw the pile card, tap-select a card, press Discard
    my_turn(ram); ram.click("#discSlot"); my_turn(ram, "discard")
    # the card just taken may not be thrown back: select a different one
    ram.locator(".card.mine").nth(2).click(position={"x": 8, "y": 20}); time.sleep(0.4)
    shot(ram, "06-ram-selected-phone.png")
    ram.click("#aDiscard");
    print("ram discarded via tap+button")

    # Ashish (dealer, rigged winning hand): draw, Auto, Show, Declare
    my_turn(host); host.click("#stockSlot"); my_turn(host, "discard")
    host.click(".sort button[data-sort=auto]"); time.sleep(1.0)
    shot(host, "07-auto-grouped-phone.png")
    host.wait_for_selector("#aShow:not([hidden])"); host.click("#aShow")
    host.wait_for_function("document.querySelector('#maalLabel').textContent === 'Tiplu'")
    time.sleep(1.2); shot(host, "08-maal-seen-phone.png")
    host.wait_for_selector("#aDeclare:not([hidden])")

    # reconnect: refresh the page mid-turn, the same seat must come back with its hand
    host.reload(); host.wait_for_selector("#game:not([hidden])"); time.sleep(1.2)
    n = host.locator(".card.mine").count(); print("cards in hand after refresh:", n)
    assert n == 13, f"expected 13 cards in hand after show+refresh, got {n}"
    host.wait_for_selector("#aDeclare:not([hidden])")
    shot(host, "09-after-refresh-phone.png")

    # laptop-size screenshot of the same table
    host.set_viewport_size({"width": 1920, "height": 1080}); time.sleep(1.2)
    shot(host, "10-table-laptop.png")
    host.set_viewport_size(PHONE); time.sleep(0.8)

    host.click("#aDeclare")
    host.wait_for_selector("#sheet:not([hidden])", timeout=8000)
    time.sleep(1.0); shot(host, "11-scoresheet-phone.png")
    txt = host.inner_text("#sheetBody"); print(txt.replace("\n", " | ")[:600])
    assert "Ashish wins" in txt
    host.set_viewport_size({"width": 1920, "height": 1080}); time.sleep(0.8)
    shot(host, "12-scoresheet-laptop.png")
    sita.wait_for_selector("#sheet:not([hidden])", timeout=8000)
    assert "Ashish wins" in sita.inner_text("#sheetBody")
    host.click("#nextRound"); host.wait_for_function("document.querySelector('#ground').textContent.includes('Round 2')")
    time.sleep(3.5); shot(host, "13-round2-laptop.png")

    print("console errors:", errors)
    br.close()
    sys.exit(1 if errors else 0)
