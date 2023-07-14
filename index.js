const { chromium } = require('playwright')
const XLSX = require('xlsx');


const urlsToScrap = [

]


let placa_id = 513;

const placas_electrónicas = [];

; (async () => {

    const browser = await chromium.launch();



    for (u of urlsToScrap) {

        const page = await browser.newPage();

        let url = u + 1
        await page.goto(url, { timeout: 260000 });



        const productosTotales = await page.$('.total-products p');
        const productosTotalesString = await productosTotales.textContent();
        const productosTotalesInt = parseInt(productosTotalesString.match(/\d+/)[0]);
        const paginasDeProductos = Math.ceil(productosTotalesInt / 12);



        console.log('Páginas totales a scrapear: ' + paginasDeProductos)


        page.close();

        for (let i = 1; i <= paginasDeProductos; i++) {

            const pages = [];
            const urlPag = u + i;

            const page = await browser.newPage();

            await page.goto(urlPag, { timeout: 260000 });

            const articles = await page.$$('#products article');


            console.log("Pagina: " + i)
            console.log(urlPag)

            for (const article of articles) {
                // Conseguir link de la pagina
                const linkSingleProductHTML = await article.$('.product-cover-link');
                const linkSingleProductString = await linkSingleProductHTML.getAttribute('href');

                pages.push(linkSingleProductString);
            }


            for (const productPage in pages) {


                const page = await browser.newPage();
                await page.goto(pages[productPage], { timeout: 260000 });
                await page.waitForLoadState('networkidle');

                const nombreProductoHTML = await page.$('.page-heading');
                const nombreProductoString = await nombreProductoHTML.textContent();

                const precioProductoHTML = await page.$('.current-price');
                let precioProductoString = await precioProductoHTML.textContent();
                precioProductoString = precioProductoString.replace(".", "")
                let precioInt = parseInt(precioProductoString.replace("€", ""));
                precioInt = precioInt * 1.1;




                const imgUrlHTML = await page.$('.img-fluid');
                const imgUrlString = await imgUrlHTML.getAttribute('src');

                let marcaString = 'Ninguna';
                const marcaHTML = await page.$('.product-manufacturer span');

                if (marcaHTML !== null) {
                    marcaString = await marcaHTML.textContent();
                }

                let stockString = '0 artículos';
                const stockHTML = await page.$('.product-quantities span');


                if (stockHTML !== null) {
                    stockString = await stockHTML.textContent();
                }

                const stockInt = parseInt(stockString);


                placa_id++;

                // MANEJO DE LA INFORMACIÓN
                placas_electrónicas.push(
                    {
                        "ID": placa_id,
                        "SKU": placa_id,
                        "Tipo": 'simple',
                        "Nombre": nombreProductoString,
                        "Publicado": 1,
                        "Visibilidad en el catálogo": 'visible',
                        "Descripción corta": 'NUEVA: ' + nombreProductoString,
                        "Estado de impuestos": 'taxable',
                        "Clase de impuestos": 'IVA',
                        "¿Hay existencias?": stockInt === 0 ? 0 : 1,
                        "¿Se permiten reservas?": 0,
                        "¿Vendido individualmente?": 1,
                        "¿Permitir valoraciones?": 1,
                        "Nota de compra": '¡Gracias por tu compra!',
                        "Precio": precioInt.toFixed(2),
                        "Inventario": stockInt,
                        "Categorías": marcaString === 'Ninguna' ? 'Placas por código' : marcaString,
                        "Etiquetas": marcaString === 'Nueva',
                        "Clase de envío": 'MRW',
                        "Images": imgUrlString,
                    })

                page.close();


            }


        }

    }


    console.log(placas_electrónicas);

    // Crea un nuevo libro de Excel
    const workbook = XLSX.utils.book_new();

    // Crea una nueva hoja de cálculo en el libro
    const worksheet = XLSX.utils.json_to_sheet(placas_electrónicas);

    // Agrega la hoja de cálculo al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Placas Electronicas');

    // Guarda el libro como un archivo Excel
    XLSX.writeFile(workbook, 'placas_electronicas.xlsx');


    await browser.close();
})()



// FUNCIONA
