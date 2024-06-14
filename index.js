const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const path = require('path');
require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const getQuotes = async (url) => {
    const browser = await puppeteer.launch({ 
        headless: true ,
        args: [
            "--disable-setuid-sandbox",
            "--no-sandbox",
            "--single-process",
            "--no-zygote",
          ],
          executablePath:
            process.env.NODE_ENV === "production"
              ? process.env.PUPPETEER_EXECUTABLE_PATH
              : puppeteer.executablePath(),
    });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        await page.setViewport({
            width: 1200,
            height: 10000
        });

        await autoScroll(page);

        const imgSrcs = await page.evaluate(() => {
            const imgs = document.querySelectorAll('picture img');
            return Array.from(imgs).map(img => img.getAttribute('src'));
        });

        return imgSrcs;
    } catch (error) {
        throw error; // Propagate error to be handled by caller
    } finally {
        await browser.close();
    }
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/scrape', async (req, res) => {
    const { url } = req.body;
    try {
        const data = await getQuotes(url);
        res.json(data);
    } catch (error) {
        console.error('Error during scraping:', error);
        res.status(500).json({ error: 'Failed to scrape data from URL' });
    }
});

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight - window.innerHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Handle process events to ensure server stability
process.on('unhandledRejection', (error, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', error);
    // Handle the error or log it
});

process.on('uncaughtException', (error, origin) => {
    console.error('Uncaught Exception:', error, 'origin:', origin);
    // Handle the error or log it
});

// Example of using pm2 to manage the server process:
// Ensure to install pm2 globally: npm install -g pm2
// Then start the server with pm2 for process management:
// pm2 start app.js --name "gallery-grab"

// pm2 will automatically restart the server if it crashes or encounters an error

// If not using pm2, ensure to monitor and manage your server process effectively
