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
        # -> Fill the 'Usuario' field with 'mesero', fill the 'Contraseña' field with '123456', then click the 'Ingresar' button to sign in as the MESERO user.
        # Ingresa tu usuario text field
        elem = page.locator('[id="usuario"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("mesero")
        
        # -> Fill the 'Usuario' field with 'mesero', fill the 'Contraseña' field with '123456', then click the 'Ingresar' button to sign in as the MESERO user.
        # Ingresa tu contraseña password field
        elem = page.locator('[id="password"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("123456")
        
        # -> Fill the 'Usuario' field with 'mesero', fill the 'Contraseña' field with '123456', then click the 'Ingresar' button to sign in as the MESERO user.
        # Ingresar button
        elem = page.get_by_role('button', name='Ingresar', exact=True)
        await elem.click(timeout=10000)
        
        # -> Open the table tile labeled '10' on the Mapa de Mesas to view its details and locate an unmerge/separate action.
        # table_restaurant 10 Libre button
        elem = page.get_by_role('button', name='table_restaurant 10 Libre', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Volver al mapa de mesas' button to return to the table map and locate any merged tables.
        # arrow_back Volver al mapa de mesas button
        elem = page.locator('[id="btn-back"]')
        await elem.click(timeout=10000)
        
        # -> Open the table tile labeled '10' on the Mapa de Mesas to view its details and look for an unmerge / separate action.
        # table_restaurant 10 Libre button
        elem = page.get_by_role('button', name='table_restaurant 10 Libre', exact=True)
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Verify the table is displayed as free
        # Assert: The table button displays the 'Libre' label, confirming the table is free.
        await expect(page.locator("xpath=/html/body/main/div[3]/div[2]/div[2]/button[10]").nth(0)).to_contain_text("Libre", timeout=15000), "The table button displays the 'Libre' label, confirming the table is free."
        
        # --> Verify the merged state is no longer displayed
        await page.locator("xpath=/html/body/main/div[3]/div[2]/div[2]/button[10]").nth(0).scroll_into_view_if_needed()
        # Assert: Table 10 is visible on the table map.
        await expect(page.locator("xpath=/html/body/main/div[3]/div[2]/div[2]/button[10]").nth(0)).to_be_visible(timeout=15000), "Table 10 is visible on the table map."
        # Assert: Table 10 shows the status 'Libre', confirming the merged state is not displayed.
        await expect(page.locator("xpath=/html/body/main/div[3]/div[2]/div[2]/button[10]").nth(0)).to_contain_text("Libre", timeout=15000), "Table 10 shows the status 'Libre', confirming the merged state is not displayed."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    