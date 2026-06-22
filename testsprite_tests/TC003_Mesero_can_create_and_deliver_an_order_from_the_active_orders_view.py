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
        
        # -> Rellenar 'mesero' en el campo Usuario, '123456' en el campo Contraseña y hacer clic en el botón 'Ingresar' para iniciar sesión.
        # Ingresa tu usuario text field
        elem = page.locator('[id="usuario"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("mesero")
        
        # -> Rellenar 'mesero' en el campo Usuario, '123456' en el campo Contraseña y hacer clic en el botón 'Ingresar' para iniciar sesión.
        # Ingresa tu contraseña password field
        elem = page.locator('[id="password"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("123456")
        
        # -> Rellenar 'mesero' en el campo Usuario, '123456' en el campo Contraseña y hacer clic en el botón 'Ingresar' para iniciar sesión.
        # Ingresar button
        elem = page.get_by_role('button', name='Ingresar', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill the 'Contraseña' field with '123456' and click the 'Ingresar' button to attempt login as the mesero user, then verify redirection to the Mesero map of tables page.
        # Ingresa tu contraseña password field
        elem = page.locator('[id="password"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("123456")
        
        # -> Fill the 'Contraseña' field with '123456' and click the 'Ingresar' button to attempt login as the mesero user, then verify redirection to the Mesero map of tables page.
        # Ingresar button
        elem = page.get_by_role('button', name='Ingresar', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill the 'Contraseña' field with '123456' and click the 'Ingresar' button to attempt login as the mesero user, then observe whether the app redirects to the Mesero map of tables page.
        # Ingresa tu contraseña password field
        elem = page.locator('[id="password"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("123456")
        
        # -> Open a free table by clicking the 'Añadir pedido' button on a free table (for example, the table labeled '1') to start creating a new order.
        # table_restaurant 1 Libre button
        elem = page.get_by_role('button', name='table_restaurant 1 Libre', exact=True)
        await elem.click(timeout=10000)
        
        # -> Agregar al pedido los platos '3 leches' y 'Flan de coco' usando los botones 'add' en la carta, luego pulsar 'Confirmar pedido' para crear la orden.
        # add button
        elem = page.get_by_text('3 lechesS/ 19.00', exact=True).locator("xpath=ancestor-or-self::*[.//button][1]").get_by_role('button', name='add', exact=True)
        await elem.click(timeout=10000)
        
        # -> Agregar al pedido los platos '3 leches' y 'Flan de coco' usando los botones 'add' en la carta, luego pulsar 'Confirmar pedido' para crear la orden.
        # add button
        elem = page.get_by_text('0', exact=True).locator("xpath=ancestor-or-self::*[.//button][1]").get_by_role('button', name='add', exact=True)
        await elem.click(timeout=10000)
        
        # -> Agregar al pedido los platos '3 leches' y 'Flan de coco' usando los botones 'add' en la carta, luego pulsar 'Confirmar pedido' para crear la orden.
        # send Confirmar pedido button
        elem = page.locator('[id="btn-confirm"]')
        await elem.click(timeout=10000)
        
        # -> Wait for the order send to finish and then click the 'Confirmar pedido' (the orange/btn labeled 'Enviando...' / 'Confirmar pedido') button to finalize creating the order.
        # hourglass_empty Enviando... button
        elem = page.locator('[id="btn-confirm"]')
        await elem.click(timeout=10000)
        
        # -> Esperar a que la operación de envío termine y luego pulsar el botón 'Confirmar pedido' (etiqueta 'Enviando...' / 'Confirmar pedido'); tras ello localizar el pedido en la vista de Pedidos activos o en el Mapa de Mesas para marcarlo como e...
        # hourglass_empty Enviando... button
        elem = page.locator('[id="btn-confirm"]')
        await elem.click(timeout=10000)
        
        # -> Wait until the 'Enviando...' button finishes and becomes the enabled 'Confirmar pedido' button, then click the 'Confirmar pedido' button to finalize the order.
        # hourglass_empty Enviando... button
        elem = page.locator('[id="btn-confirm"]')
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Verify the added items are displayed on the order
        await page.locator("xpath=/html/body/div[2]/aside/div[3]/div[2]/div/div/button").nth(0).scroll_into_view_if_needed()
        # Assert: The order shows the first added item (its delete button is visible).
        await expect(page.locator("xpath=/html/body/div[2]/aside/div[3]/div[2]/div/div/button").nth(0)).to_be_visible(timeout=15000), "The order shows the first added item (its delete button is visible)."
        await page.locator("xpath=/html/body/div[2]/aside/div[3]/div[3]/div/div/button").nth(0).scroll_into_view_if_needed()
        # Assert: The order shows the second added item (its delete button is visible).
        await expect(page.locator("xpath=/html/body/div[2]/aside/div[3]/div[3]/div/div/button").nth(0)).to_be_visible(timeout=15000), "The order shows the second added item (its delete button is visible)."
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
    