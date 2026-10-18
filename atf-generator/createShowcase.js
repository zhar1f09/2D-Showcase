import sideDrawingCoordinates from './sideDrawingCoordinates.js'

export default function createShowcase(settings) {
    const screen = document.querySelector('[data-screen]')
    const context = screen.getContext('2d')

    screen.width = 700
    screen.height = 450

    function drawSide(x, y, pixelRGB) {
        const sideCoordinates = sideDrawingCoordinates[pixelRGB]
        for (const coordinates of sideCoordinates) {
            const { imageType, sourceX, sourceY, offsetX, offsetY, width } = coordinates
            const image = settings[imageType]
            const dx = x + offsetX
            const dy = y + offsetY

            if (image) {
                // Draw clothing if uploaded
                context.drawImage(image, sourceX, sourceY, width, 128, dx, dy, width, 128)
            } else {
                // Fill with selected skin color if NO clothing is uploaded
                context.fillStyle = settings.color || '#1b1b1b'
                context.fillRect(dx, dy, width, 128)
            }
        }
    }

    function generate() {
        context.clearRect(0, 0, screen.width, screen.height)
        drawTemplate()
        
        const imageData = context.getImageData(0, 0, screen.width, screen.height).data
        const foundAnchors = {}
        
        for (let y = 0; y < screen.height; y++) {
            for (let x = 0; x < screen.width; x++) {
                const index = (y * screen.width + x) * 4
                const r = imageData[index], g = imageData[index + 1], b = imageData[index + 2], a = imageData[index + 3]
                if (a === 0) continue
                
                const pixelRGB = `rgb(${r}, ${g}, ${b})`
                if (pixelRGB in sideDrawingCoordinates && !foundAnchors[pixelRGB]) {
                    foundAnchors[pixelRGB] = { x, y }
                }
            }
        }
        
        for (const pixelRGB in foundAnchors) {
            const { x, y } = foundAnchors[pixelRGB]
            drawSide(x, y, pixelRGB)
        }
    }

    function drawTemplate() {
        const template = settings.template
        if (!template) return
        screen.width = template.width
        screen.height = template.height
        context.drawImage(template, 0, 0)
    }

    return { drawTemplate, generate }
}