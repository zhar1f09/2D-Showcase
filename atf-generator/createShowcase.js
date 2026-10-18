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

    function generate() {
        context.clearRect(0, 0, screen.width, screen.height)
        drawTemplate()
        
        // 1. Get the pixel data of the whole template at once (much faster)
        const imageData = context.getImageData(0, 0, screen.width, screen.height).data
        
        // 2. Find the top-left pixel of each color
        const foundAnchors = {}
        
        for (let y = 0; y < screen.height; y++) {
            for (let x = 0; x < screen.width; x++) {
                const index = (y * screen.width + x) * 4
                const r = imageData[index]
                const g = imageData[index + 1]
                const b = imageData[index + 2]
                const a = imageData[index + 3]
                
                if (a === 0) continue // Skip transparent
                
                const pixelRGB = `rgb(${r}, ${g}, ${b})`
                
                // If it's an anchor color and we haven't found it yet
                if (pixelRGB in sideDrawingCoordinates && !foundAnchors[pixelRGB]) {
                    foundAnchors[pixelRGB] = { x, y }
                }
            }
        }
        
        // 3. Loop through the anchors we found and draw the clothes/skin ONCE
        for (const pixelRGB in foundAnchors) {
            const { x, y } = foundAnchors[pixelRGB]
            const sideCoordinates = sideDrawingCoordinates[pixelRGB]
            
            for (const coordinates of sideCoordinates) {
                const { imageType, offsetX, offsetY, width } = coordinates
                const image = settings[imageType]
                const dx = x + offsetX
                const dy = y + offsetY
                
                // If user uploaded clothes, draw the clothes.
                // If not, draw the skin color.
                if (image) {
                    context.drawImage(image, coordinates.sourceX, coordinates.sourceY, width, 128, dx, dy, width, 128)
                } else {
                    context.fillStyle = settings.color
                    context.fillRect(dx, dy, width, 128)
                }
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
