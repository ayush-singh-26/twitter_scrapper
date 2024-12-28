// Required modules
const { Builder, By, until } = require('selenium-webdriver');
const { MongoClient } = require('mongodb');
const express = require('express');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const mongoUrl = process.env.MONGODB_URI;
const email = process.env.email;
const password = process.env.password;

const generateRandomIp = () => {
    return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
};

const scrapeTwitterTrends = async () => {
    let driver;
    try {
        driver = await new Builder().forBrowser('chrome').build();
        await driver.get('https://x.com/i/flow/login');

        // Login process
        const emailField = await driver.wait(until.elementLocated(By.name('text')), 20000);
        await emailField.sendKeys(email);
        const nextButton1 = await driver.findElement(By.xpath("//span[contains(text(),'Next')]"));
        await nextButton1.click();

        const usernameField = await driver.wait(until.elementLocated(By.name('text')), 20000);
        await usernameField.sendKeys("ayushsingh53718");
        const nextButton2 = await driver.findElement(By.xpath("//span[contains(text(),'Next')]"));
        await nextButton2.click();

        const passwordField = await driver.wait(until.elementLocated(By.name('password')), 20000);
        await passwordField.sendKeys(password);
        const loginButton = await driver.findElement(By.xpath("//span[contains(text(),'Log in')]"));
        await loginButton.click();

        // Wait for trends to load
        await driver.wait(until.elementsLocated(By.xpath("//div[contains(@data-testid, 'trend')]")), 10000);
        const trends = await driver.findElements(By.xpath("//div[contains(@data-testid, 'trend')]"));

        const trendingTopics = [];
        for (let i = 0; i < Math.min(trends.length, 5); i++) {
            const text = await trends[i].getText();
            trendingTopics.push(text);
        }

        console.log('Trending topics:', trendingTopics);

        const ipAddress = generateRandomIp();
        console.log(`The IP address used for this query was ${ipAddress}.`);

        const uniqueId = uuidv4();
        const timestamp = new Date();

        const record = {
            _id: uniqueId,
            trend1: trendingTopics[0] || "",
            trend2: trendingTopics[1] || "",
            trend3: trendingTopics[2] || "",
            trend4: trendingTopics[3] || "",
            trend5: trendingTopics[4] || "",
            timestamp,
            ip_address: ipAddress
        };

        // Save to MongoDB
        const client = new MongoClient(mongoUrl, { useUnifiedTopology: true });
        await client.connect();
        const db = client.db("twitter_trends");
        const collection = db.collection("trends");
        await collection.insertOne(record);
        console.log("Trends saved to MongoDB");
        await client.close();

    } catch (error) {
        console.error("An error occurred during scraping:", error);
    } finally {
        if (driver) await driver.quit();
    }
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/run-script', async (req, res) => {
    await scrapeTwitterTrends();
    res.send("Script executed successfully!");
});

app.get('/results', async (req, res) => {
    try {
        const client = new MongoClient(mongoUrl, { useUnifiedTopology: true });
        await client.connect();
        const db = client.db("twitter_trends");
        const collection = db.collection("trends");
        const latestRecord = await collection.findOne({}, { sort: { timestamp: -1 } });
        res.json(latestRecord);
        await client.close();
    } catch (error) {
        console.error("An error occurred while fetching results:", error);
        res.status(500).send("Error fetching results");
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
