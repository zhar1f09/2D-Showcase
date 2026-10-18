import createInputListener from './createInputListener.js'
import createSettings from './createSettings.js'
import createShowcase from './createShowcase.js'

function main() {
    const settings = createSettings()
    const showcase = createShowcase(settings)
    const inputListener = createInputListener()

    settings.subscribe(showcase.drawTemplate)
    inputListener.addInputMethod(settings.changeSetting)
    inputListener.addInputMethod(showcase.generate)

    // Force the 2D tool to accept syncs from the 3D tool
    window.addEventListener('message', (event) => {
        if (event.data.type === 'LOAD_IMAGE') {
            const { role, base64 } = event.data;
            const img = new Image();
            img.src = base64;
            img.onload = () => {
                settings[role] = img;
                
                const display = document.querySelector(`[data-display="${role}"]`);
                if (display) display.innerText = "Synced from 3D";
                
                showcase.generate();
            };
        }
    });
}

setTimeout(main, 1000)