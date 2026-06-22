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
        
        # -> Rellenar el campo 'Usuario' con "admin", el campo 'Contraseña' con "12345" y hacer clic en el botón 'Ingresar' para probar el acceso de ADMIN.
        # Ingresa tu usuario text field
        elem = page.locator('[id="usuario"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("admin")
        
        # -> Rellenar el campo 'Usuario' con "admin", el campo 'Contraseña' con "12345" y hacer clic en el botón 'Ingresar' para probar el acceso de ADMIN.
        # Ingresa tu contraseña password field
        elem = page.locator('[id="password"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("12345")
        
        # -> Rellenar el campo 'Usuario' con "admin", el campo 'Contraseña' con "12345" y hacer clic en el botón 'Ingresar' para probar el acceso de ADMIN.
        # Ingresar button
        elem = page.get_by_role('button', name='Ingresar', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Ingresar' button to submit the login form and verify redirection to the Admin area or any error message.
        # Ingresar button
        elem = page.get_by_role('button', name='Ingresar', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Ingresar' button to submit the login form and then verify redirection to the Admin area (look for Admin dashboard or URL /Admin/Had-01_cobro-mesas.html).
        # Ingresar button
        elem = page.get_by_role('button', name='Ingresar', exact=True)
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Verify the authenticated area is displayed
        # Assert: Browser is on the Admin Cobro de Mesas page URL.
        await expect(page).to_have_url(re.compile("/Admin/Had\\-01_cobro\\-mesas\\.html"), timeout=15000), "Browser is on the Admin Cobro de Mesas page URL."
        # Assert: Top-right account label displays 'Admin'.
        await expect(page.locator("xpath=/html/body/header/div[2]/div/span[2]").nth(0)).to_have_text("Admin", timeout=15000), "Top-right account label displays 'Admin'."
        # Assert: Navigation contains the 'Cobro de Mesas' label indicating the Admin section.
        await expect(page.locator("xpath=/html/body/nav/div/div[1]/a").nth(0)).to_contain_text("Cobro de Mesas", timeout=15000), "Navigation contains the 'Cobro de Mesas' label indicating the Admin section."
        await page.locator("xpath=/html/body/header/div[2]/button").nth(0).scroll_into_view_if_needed()
        # Assert: A 'Cerrar sesión' (logout) button is visible, confirming an authenticated session.
        await expect(page.locator("xpath=/html/body/header/div[2]/button").nth(0)).to_be_visible(timeout=15000), "A 'Cerrar sesi\u00f3n' (logout) button is visible, confirming an authenticated session."
        
        # --> Verify the user is recognized with admin access
        # Assert: The top-right account label reads 'Admin'.
        await expect(page.locator("xpath=/html/body/header/div[2]/div/span[2]").nth(0)).to_have_text("Admin", timeout=15000), "The top-right account label reads 'Admin'."
        await page.locator("xpath=/html/body/header/div[2]/button").nth(0).scroll_into_view_if_needed()
        # Assert: The 'Cerrar sesión' (logout) button is visible.
        await expect(page.locator("xpath=/html/body/header/div[2]/button").nth(0)).to_be_visible(timeout=15000), "The 'Cerrar sesi\u00f3n' (logout) button is visible."
        # Assert: The admin navigation shows 'Administración del Menú', indicating admin access.
        await expect(page.locator("xpath=/html/body/nav/div/div[2]/a/span[2]").nth(0)).to_have_text("Administraci\u00f3n del Men\u00fa", timeout=15000), "The admin navigation shows 'Administraci\u00f3n del Men\u00fa', indicating admin access."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    