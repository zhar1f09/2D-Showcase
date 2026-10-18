export default async function getImageFromInput() {
    async function getFile() {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/PNG'
        input.click()
        return new Promise(resolve => {
            input.onchange = () => {
                const file = input.files[0]
                resolve(file)
            }
        })
    }

    const file = await getFile()
    const image = new Image()
    image.src = URL.createObjectURL(file)
    image.fileName = file.name
    return new Promise(resolve => {
        image.onload = () => {
            URL.revokeObjectURL(image.src)
            resolve(image)
        }
    })
}
