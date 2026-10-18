import getImageFromInput from './getImageFromInput.js'

export default function createSettings() {
    const defaultTemplate = new Image();
    defaultTemplate.src = './media/2D.png';

    let settings = {
        shirt: undefined,
        pants: undefined,
        template: defaultTemplate,
        color: '#1b1b1b',
        changeSetting,
        subscribe,
    }

    const observers = []

    const settingFunctions = {
        color: changeColor,
        'shirt, pants, template': changeImageSetting,
    }

    function subscribe(observerFunction) {
        observers.push(observerFunction)
    }

    function notifyAll(command) {
        for (const observerFunction of observers) {
            observerFunction(command)
        }
    }

    function changeSetting(command) {
        const settingToChange = command.setting
        for (const functionKey in settingFunctions) {
            if (!functionKey.includes(settingToChange)) continue
            settingFunctions[functionKey](command)
        }
    }

    function changeColor(command) {
        const colorElement = command.settingDisplay
        settings.color = colorElement.value || '#1b1b1b'
    }

    async function changeImageSetting(command) {
        const { setting, settingDisplay } = command
        const image = await getImageFromInput()
        settings[setting] = image
        settingDisplay.innerText = image.fileName

        notifyAll({
            template: settings.template,
        })
    }

    return settings
}
