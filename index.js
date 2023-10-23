const { chromium } = require('playwright')
const XLSX = require('xlsx');

const urlPagina = 'https://suministrosclimafrio.es/es/'

let categoriesInfo = []

let product_id = 0;

const productos = [];

; (async () => {


    // CONSEGUIR LAS URLS DE LAS CATEGORIAS
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto(urlPagina);

    const linksCategorias = await page.evaluate(() => {
        const ul = document.getElementById('amegamenu');
        return Array.from(ul.querySelectorAll('a'), link => link.href);
    });

    const nombresCategorias = await page.evaluate(() => {
        const ul = document.getElementById('amegamenu');
        return Array.from(ul.querySelectorAll('a'), name => name.textContent.trim());
    });

    let categoriasUrl = linksCategorias.filter((num, index) => index !== 1);
    let categoriasNombres = nombresCategorias.filter((num, index) => index !== 1);

    for (url in categoriasUrl) {
        const newCategoria = {
            nombre: categoriasNombres[url],
            url: categoriasUrl[url]
        }
        categoriesInfo.push(newCategoria)

    }


    console.log(categoriesInfo)

    await page.close();



    // BUCLE PARA CONSEGUIR LOS DATOS DE LOS PRODUCTOS
    for (categoria of categoriesInfo) {

        const page = await browser.newPage();

        let url = categoria.url + 1
        await page.goto(url, { timeout: 260000 });



        const productosTotales = await page.$('.total-products p');
        const productosTotalesString = await productosTotales.textContent();
        const productosTotalesInt = parseInt(productosTotalesString.match(/\d+/)[0]);
        const paginasDeProductos = Math.ceil(productosTotalesInt / 12);



        console.log('Páginas totales a scrapear: ' + paginasDeProductos)


        page.close();

        for (let i = 1; i <= paginasDeProductos; i++) {

            const pages = [];
            const urlPag = `${categoria.url}?page=${i}`
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
                await page.goto(pages[productPage], { timeout: 320000 });
                await page.waitForLoadState('networkidle');


                // Nombre producto
                const nombreProductoHTML = await page.$('.page-heading');
                const nombreProductoString = await nombreProductoHTML.textContent();
                // Imagen producto
                const imgUrlHTML = await page.$('.img-fluid');
                const imgUrlString = await imgUrlHTML.getAttribute('src');
                // Marca producto
                let marcaString = 'Ninguna';
                const marcaHTML = await page.$('.product-manufacturer span');

                if (marcaHTML !== null) {
                    marcaString = await marcaHTML.textContent();
                }
                // Referencia producto
                const referenciaProductoHTML = await page.$('.product-reference span');
                const referenciaProductoString = await referenciaProductoHTML.textContent();
                // Stock producto
                let stockString = '0 artículos';
                const stockHTML = await page.$('.product-quantities span');


                if (stockHTML !== null) {
                    stockString = await stockHTML.textContent();
                }

                const stockInt = parseInt(stockString);
                // Descripcion corta
                const descripcionCortaProductoArray = await page.$eval('.product-description-short', div => {
                    return Array.from(div.querySelectorAll('p'), p => p.innerText);
                });

                const descripcionCortaProductoString = descripcionCortaProductoArray.join('\n')

                // Categorias
                const categoriasLis = await page.$$('.breadcrumb-item');

                const categoriasSpans = [];

                for (const li of categoriasLis) {
                    const span = await li.$('a span');
                    if (span) {
                        if (span.textContent() != 'chevron_right' && span.textContent() != nombreProductoString) {
                            categoriasSpans.push(await span.textContent());
                        }
                    }
                }

                const categoriasProducto = categoriasSpans.filter(categoria => categoria !== 'Inicio');
                const categoriasProductoString = categoriasProducto.join(',');
                // Keywords
                const keywordsArray = [marcaString, categoriasProductoString];
                const keywords = keywordsArray.join(',');
                // Precio producto
                const precioProductoHTML = await page.$('.current-price');
                let precioProductoString = await precioProductoHTML.textContent();
                precioProductoString = precioProductoString.replace(".", "")
                let precioInt = parseInt(precioProductoString.replace("€", ""));

                if (categoria.nombre === 'Placas Electrónicas') {
                    precioInt = precioInt / 1.05;
                }
                // Pasar al siguiente producto para no repetir ids
                product_id++;

                // MANEJO DE LA INFORMACIÓN
                productos.push(
                    {
                        "Product ID": product_id,
                        "Active 0/1": 1,
                        "Name*": nombreProductoString,
                        "Categories (x,y,z…)": categoriasProductoString,
                        "Price tax excluded": precioInt,
                        "Tax rules ID": 1,
                        "On sale (0/1)": 1,
                        "Reference #": referenciaProductoString,
                        "Manufacturer": marcaString,
                        "Width": "",
                        "Height": "",
                        "Depth": "",
                        "Weight": "",
                        "Delivery time of in-stock products": 48,
                        "Quantity": stockInt,
                        "Low Stock Level": 1,
                        "Send me an email when the quantity is under this level": 0,
                        "Visibility": 'Both',
                        "Summary": descripcionCortaProductoString,
                        "Description": descripcionCortaProductoString,
                        "Meta title": nombreProductoString,
                        "Meta keywords": keywords,
                        "Text when backorder allowed": 'No se va a usar',
                        "Available for order (0 = No, 1 = Yes)": 1,
                        "Show price (0 = No, 1 = Yes)": 1,
                        "Image URLs (x,y,z…)": imgUrlString,
                        "Condition": 'Nuevo',
                        "Out of stock action": 1,
                    })

                page.close();

                console.log(`Producto ${product_id} actualizado`);
            }


        }

    }
    // Crea un nuevo libro de Excel
    const workbook = XLSX.utils.book_new();

    // Crea una nueva hoja de cálculo en el libro
    const worksheet = XLSX.utils.json_to_sheet(productos);

    // Agrega la hoja de cálculo al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

    // Guarda el libro como un archivo Excel
    XLSX.writeFile(workbook, 'productos.xlsx');


    await browser.close();

})()



// FUNCIONA

