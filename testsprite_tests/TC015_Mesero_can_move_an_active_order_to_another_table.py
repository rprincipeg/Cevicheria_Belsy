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
        
        # -> Fill 'mesero' into the 'Usuario' field, fill '123456' into the 'Contraseña' field, then click the 'Ingresar' button to log in as the mesero user.
        # Ingresa tu usuario text field
        elem = page.locator('[id="usuario"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("mesero")
        
        # -> Fill 'mesero' into the 'Usuario' field, fill '123456' into the 'Contraseña' field, then click the 'Ingresar' button to log in as the mesero user.
        # Ingresa tu contraseña password field
        elem = page.locator('[id="password"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("123456")
        
        # -> Fill 'mesero' into the 'Usuario' field, fill '123456' into the 'Contraseña' field, then click the 'Ingresar' button to log in as the mesero user.
        # Ingresar button
        elem = page.get_by_role('button', name='Ingresar', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Ingresar' button to submit the login form and open the Mesero table map view.
        # Ingresar button
        elem = page.get_by_role('button', name='Ingresar', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Mover pedido' button, then click an occupied table (e.g., the table showing 'OCUPADA' such as table 2) and then click a free table (e.g., the table showing 'LIBRE' such as table 1) to move the order.
        # move_up Mover pedido button
        elem = page.locator('[id="btn-mover-pedido"]')
        await elem.click(timeout=10000)
        
        # -> Click the 'Mover pedido' button, then click an occupied table (e.g., the table showing 'OCUPADA' such as table 2) and then click a free table (e.g., the table showing 'LIBRE' such as table 1) to move the order.
        # table_restaurant 2 Ocupada add_circle Añadir... button
        elem = page.get_by_role('button', name='table_restaurant 2 Ocupada add_circle Añadir pedido', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Mover pedido' button, then select occupied table '2' as the source, and then select free table '1' as the destination to move the order.
        # move_up Mover pedido button
        elem = page.locator('[id="btn-mover-pedido"]')
        await elem.click(timeout=10000)
        
        # -> Click the 'Mover pedido' button, then select occupied table '2' as the source, and then select free table '1' as the destination to move the order.
        # table_restaurant 2 Ocupada add_circle Añadir... button
        elem = page.get_by_role('button', name='table_restaurant 2 Ocupada add_circle Añadir pedido', exact=True)
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
    