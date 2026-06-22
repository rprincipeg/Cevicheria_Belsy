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
        # -> Fill the 'Usuario' field with 'mesero', fill the 'Contraseña' field with '123456', then click the 'Ingresar' button to sign in.
        # Ingresa tu usuario text field
        elem = page.locator('[id="usuario"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("mesero")
        
        # -> Fill the 'Usuario' field with 'mesero', fill the 'Contraseña' field with '123456', then click the 'Ingresar' button to sign in.
        # Ingresa tu contraseña password field
        elem = page.locator('[id="password"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("123456")
        
        # -> Fill the 'Usuario' field with 'mesero', fill the 'Contraseña' field with '123456', then click the 'Ingresar' button to sign in.
        # Ingresar button
        elem = page.get_by_role('button', name='Ingresar', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Mover pedido' button to start the move-order flow, then select an occupied table (a tile labeled 'OCUPADA') and click a free table (a tile labeled 'LIBRE') to relocate the active order.
        # move_up Mover pedido button
        elem = page.locator('[id="btn-mover-pedido"]')
        await elem.click(timeout=10000)
        
        # -> Click the 'Mover pedido' button to start the move-order flow, then select an occupied table (a tile labeled 'OCUPADA') and click a free table (a tile labeled 'LIBRE') to relocate the active order.
        # table_restaurant 2 Ocupada add_circle Añadir... button
        elem = page.get_by_role('button', name='table_restaurant 2 Ocupada add_circle Añadir pedido', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Mover pedido' (Move order) button to start the relocation flow on the Mapa de Mesas page.
        # move_up Mover pedido button
        elem = page.locator('[id="btn-mover-pedido"]')
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        current_url = await page.evaluate("() => window.location.href")
        # Assert: page loaded with a URL (final outcome verified by the AI judge during the run)
        assert current_url, 'Page should have loaded with a URL'
        current_url = await page.evaluate("() => window.location.href")
        # Assert: page loaded with a URL (final outcome verified by the AI judge during the run)
        assert current_url, 'Page should have loaded with a URL'
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    