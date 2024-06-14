const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer-core");
const chrome = require("chrome-aws-lambda");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const getQuotes = async (url) => {
  console.log("Launching browser...");
  let browser;
  try {
    browser = await puppeteer.launch({
      args: chrome.args,
      executablePath: await chrome.executablePath,
      headless: chrome.headless,
    });
    console.log("Browser launched.");

    const page = await browser.newPage();
    console.log("New page created.");

    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: "networkidle2" });
    console.log(`Navigated to ${url}`);

    await page.setViewport({
      width: 1200,
      height: 10000,
    });
    console.log("Viewport set.");

    await autoScroll(page);
    console.log("Page scrolled.");

    const imgSrcs = await page.evaluate(() => {
      const imgs = document.querySelectorAll("picture img");
      return Array.from(imgs).map((img) => img.getAttribute("src"));
    });
    console.log("Image sources extracted.");

    return imgSrcs;
  } catch (error) {
    console.error("Error during page operations:", error);
    throw error; // Propagate error to be handled by caller
  } finally {
    if (browser) {
      await browser.close();
      console.log("Browser closed.");
    }
  }
};

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/scrape", async (req, res) => {
  const { url } = req.body;
  try {
    console.log(`Scraping URL: ${url}`);
    const data = await getQuotes(url);
    res.json(data);
  } catch (error) {
    console.error("Error during scraping:", error);
    res.status(500).json({ error: "Failed to scrape data from URL" });
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
process.on("unhandledRejection", (error, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", error);
  // Handle the error or log it
});

process.on("uncaughtException", (error, origin) => {
  console.error("Uncaught Exception:", error, "origin:", origin);
  // Handle the error or log it
});
