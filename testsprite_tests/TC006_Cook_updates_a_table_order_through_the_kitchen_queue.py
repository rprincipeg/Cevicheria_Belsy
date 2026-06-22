import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("http://localhost:3001/Login/acceso-por-rol.html")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Fill the 'Usuario' field with 'cocinero', fill the 'Contraseña' field with '123456', then click the 'Ingresar' button to submit the login form.
        # Ingresa tu usuario text field
        elem = page.locator('[id="usuario"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("cocinero")
        
        # -> Fill the 'Usuario' field with 'cocinero', fill the 'Contraseña' field with '123456', then click the 'Ingresar' button to submit the login form.
        # Ingresa tu contraseña password field
        elem = page.locator('[id="password"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("123456")
        
        # -> Fill the 'Usuario' field with 'cocinero', fill the 'Contraseña' field with '123456', then click the 'Ingresar' button to submit the login form.
        # Ingresar button
        elem = page.get_by_role('button', name='Ingresar', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Marcar este ítem como listo' button in the 'EN PROCESO' column to mark an item as preparado, then click the 'Marcar todo el pedido como Listo' button to mark the entire order as preparado.
        # check_circle Listo button
        elem = page.get_by_role('button', name='check_circle Listo', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Marcar este ítem como listo' button in the 'EN PROCESO' column to mark an item as preparado, then click the 'Marcar todo el pedido como Listo' button to mark the entire order as preparado.
        # check_circle Marcar todo el pedido como Listo button
        elem = page.get_by_role('button', name='check_circle Marcar todo el pedido como Listo', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Marcar este ítem como listo' button for the in-progress item, then click the 'Marcar todo el pedido como Listo' button, and verify the order appears in the 'LISTO' column and that the counters update.
        # check_circle Listo button
        elem = page.get_by_role('button', name='check_circle Listo', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Marcar este ítem como listo' button for the in-progress item, then click the 'Marcar todo el pedido como Listo' button, and verify the order appears in the 'LISTO' column and that the counters update.
        # check_circle Marcar todo el pedido como Listo button
        elem = page.get_by_role('button', name='check_circle Marcar todo el pedido como Listo', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Marcar todo el pedido como Listo' button to mark the entire order as prepared, then wait and verify the order appears in the 'LISTO' column and counters update.
        # check_circle Marcar todo el pedido como Listo button
        elem = page.get_by_role('button', name='check_circle Marcar todo el pedido como Listo', exact=True)
        await elem.click(timeout=10000)
        
        # -> Hacer clic en el botón 'Marcar todo el pedido como Listo' dentro de la tarjeta en la columna "EN PROCESO", luego esperar y verificar que la tarjeta aparece en la columna 'LISTO' y que los contadores actualizan (EN PROCESO → 0, LISTO → 1).
        # check_circle Marcar todo el pedido como Listo button
        elem = page.get_by_role('button', name='check_circle Marcar todo el pedido como Listo', exact=True)
        await elem.click(timeout=10000)
        
        # -> Hacer clic en el botón 'Marcar todo el pedido como Listo' de la tarjeta en la columna EN PROCESO, esperar 1 segundo y comprobar que la tarjeta pasa a la columna LISTO y que los contadores cambian (EN PROCESO → 0, LISTO → 1).
        # check_circle Marcar todo el pedido como Listo button
        elem = page.get_by_role('button', name='check_circle Marcar todo el pedido como Listo', exact=True)
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Verify active kitchen orders are displayed
        await page.locator("xpath=/html/body/main/div/section[1]/header/h2/span").nth(0).scroll_into_view_if_needed()
        # Assert: The PENDIENTE column header (pending_actions) is visible.
        await expect(page.locator("xpath=/html/body/main/div/section[1]/header/h2/span").nth(0)).to_be_visible(timeout=15000), "The PENDIENTE column header (pending_actions) is visible."
        # Assert: The pending orders badge shows 5 active items.
        await expect(page.locator("xpath=/html/body/main/div/section[1]/header/span").nth(0)).to_have_text("5", timeout=15000), "The pending orders badge shows 5 active items."
        await page.locator("xpath=/html/body/main/div/section[1]/div/article[1]/div/div[1]/span").nth(0).scroll_into_view_if_needed()
        # Assert: An active order card labeled 'Mesa' is visible in the pending list.
        await expect(page.locator("xpath=/html/body/main/div/section[1]/div/article[1]/div/div[1]/span").nth(0)).to_be_visible(timeout=15000), "An active order card labeled 'Mesa' is visible in the pending list."
        
        # --> Verify the updated order and item statuses are displayed
        # Assert: The LISTO column counter shows 1 order.
        await expect(page.locator("xpath=/html/body/main/div/section[3]/header/span").nth(0)).to_have_text("1", timeout=15000), "The LISTO column counter shows 1 order."
        # Assert: An item in the LISTO column displays the 'check_circle' prepared icon.
        await expect(page.locator("xpath=/html/body/main/div/section[3]/div/article/ul/li/span[2]/span").nth(0)).to_have_text("check_circle", timeout=15000), "An item in the LISTO column displays the 'check_circle' prepared icon."
        # Assert: An order card is present in the LISTO column and shows the 'room_service' label.
        await expect(page.locator("xpath=/html/body/main/div/section[3]/div/article/div[3]/span").nth(0)).to_have_text("room_service", timeout=15000), "An order card is present in the LISTO column and shows the 'room_service' label."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    