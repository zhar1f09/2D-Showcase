export default function createInputListener() {
    let acceptedInputMethods = {}

    function addInputMethod(inputMethod) {
        const methodKey = inputMethod.name
        acceptedInputMethods[methodKey] = inputMethod
    }

    function callInputMethod(command) {
        const methodKey = command.inputType
        acceptedInputMethods[methodKey]?.(command)
    }

    function handleInput(event) {
        const target = event.target
        let command = {}
        command.inputType = target.getAttribute('data-input-type')
        command.setting = target.getAttribute('data-setting')
        command.settingDisplay = document.querySelector(`[data-display="${command.setting}"]`)
        callInputMethod(command)
    }

    document.addEventListener('click', handleInput)
    document.addEventListener('change', handleInput)

    return {
        addInputMethod,
    }
}
