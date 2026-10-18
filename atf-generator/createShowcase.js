import sideDrawingCoordinates from './sideDrawingCoordinates.js'

export default function createShowcase(settings) {
    const screen = document.querySelector('[data-screen]')
    const context = screen.getContext('2d')

    // default screen width
    screen.width = 700
    screen.height = 450
    ///////////////////////

    function drawSide(x, y, pixelRGB) {
        const sideCoordinates = sideDrawingCoordinates[pixelRGB]
        for (const coordinates of sideCoordinates) {
            const { imageType, sourceX, sourceY, offsetX, offsetY, width } = coordinates
            const image = settings[imageType]
            const dx = x + offsetX
            const dy = y + offsetY

            if (!image) continue
            context.drawImage(image, sourceX, sourceY, width, 128, dx, dy, width, 128)
        }
    }

    function drawSkinOnSide(x, y, pixelRGB) {
        const sideCoordinates = sideDrawingCoordinates[pixelRGB]
        for (const coordinates of sideCoordinates) {
            const { offsetX, offsetY, width } = coordinates
            const dx = x + offsetX
            const dy = y + offsetY

            context.fillStyle = settings.color
            context.fillRect(dx, dy, width, 128)
        }
    }

    function generate() {
        context.clearRect(0, 0, screen.width, screen.height)
        drawTemplate()
        for (let y = 0; y < screen.height; y++) {
            for (let x = 0; x < screen.width; x++) {
                const pixelData = context.getImageData(x, y, 1, 1).data
                const pixelRGB = `rgb(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]})`

                if (!(pixelRGB in sideDrawingCoordinates)) continue
                drawSkinOnSide(x, y, pixelRGB)
                drawSide(x, y, pixelRGB)
            }
        }
    }

    function drawTemplate() {
        const template = settings.template
        if (!template) return
        screen.width = template.width
        screen.height = template.height
        context.drawImage(template, 0, 0)
    }

    return {
        drawTemplate,
        generate,
    }
}
